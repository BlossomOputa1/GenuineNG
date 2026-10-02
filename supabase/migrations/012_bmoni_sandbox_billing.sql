-- Sandbox-only invoice accounting. Apply after 011_create_invoices.sql.
-- Historical invoices are kept as legacy records; only new sandbox invoices
-- participate in the one-active-invoice rule.
alter table public.invoices add column if not exists bank_name text;
alter table public.invoices add column if not exists account_name text;
alter table public.invoices add column if not exists account_number text;
alter table public.invoices add column if not exists bmoni_transaction_id text;
alter table public.invoices add column if not exists billing_context text not null default 'legacy';
create unique index if not exists invoices_one_active_per_batch
  on public.invoices(batch_id)
  where status in ('pending', 'settled') and billing_context = 'bmoni_sandbox';
create unique index if not exists invoices_bmoni_transaction_id_key
  on public.invoices(bmoni_transaction_id) where bmoni_transaction_id is not null;

-- Clients can read their own invoices through the policy from migration 011.
-- Only the server's service-role connection may create or settle one.
drop policy if exists "Manufacturers can insert own invoices" on public.invoices;
revoke insert, update, delete on public.invoices from anon, authenticated;

create table if not exists public.bmoni_settlements (
  event_id text primary key,
  transaction_id text not null unique,
  invoice_id uuid not null unique references public.invoices(id),
  created_at timestamptz not null default now()
);
alter table public.bmoni_settlements enable row level security;
revoke all on public.bmoni_settlements from anon, authenticated;

create or replace function public.settle_bmoni_sandbox_invoice(
  p_reference text, p_amount numeric, p_currency text, p_account_number text,
  p_transaction_id text, p_event_id text
) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_invoice_id uuid;
begin
  select id into v_invoice_id from public.invoices
  where reference = p_reference and amount = p_amount and currency = p_currency
    and account_number = p_account_number and status = 'pending'
    and billing_context = 'bmoni_sandbox'
  for update;
  if v_invoice_id is null then return false; end if;

  insert into public.bmoni_settlements(event_id, transaction_id, invoice_id)
    values (p_event_id, p_transaction_id, v_invoice_id)
    on conflict do nothing;
  if not found then return false; end if;

  update public.invoices set status = 'settled', settled_at = now(),
    bmoni_transaction_id = p_transaction_id where id = v_invoice_id;
  return true;
end;
$$;
revoke all on function public.settle_bmoni_sandbox_invoice(text,numeric,text,text,text,text) from public, anon, authenticated;
grant execute on function public.settle_bmoni_sandbox_invoice(text,numeric,text,text,text,text) to service_role;

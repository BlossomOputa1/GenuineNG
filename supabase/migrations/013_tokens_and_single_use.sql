-- Apply after 012_bmoni_sandbox_billing.sql. Historical invoices remain intact.
-- Paid token orders alone credit the balance; issuing a batch reserves tokens once.
alter table public.invoices add column if not exists token_quantity integer;
alter table public.invoices drop constraint if exists invoices_token_order_valid;
alter table public.invoices add constraint invoices_token_order_valid check (
  billing_context <> 'bmoni_tokens' or
  (token_quantity between 1 and 100000 and batch_id is null and currency = 'NGN' and amount = token_quantity * 5)
);

create table if not exists public.manufacturer_token_accounts (
  manufacturer_id uuid primary key references public.manufacturers(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0)
);
create table if not exists public.manufacturer_token_reservations (
  batch_id uuid primary key references public.batches(id) on delete cascade,
  manufacturer_id uuid not null references public.manufacturers(id) on delete cascade,
  quantity integer not null check (quantity >= 0),
  reserved_at timestamptz not null default now()
);
alter table public.manufacturer_token_accounts enable row level security;
alter table public.manufacturer_token_reservations enable row level security;
revoke all on public.manufacturer_token_accounts, public.manufacturer_token_reservations from anon, authenticated;

create or replace function public.settle_bmoni_sandbox_invoice(
  p_reference text, p_amount numeric, p_currency text, p_account_number text,
  p_transaction_id text, p_event_id text
) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_invoice public.invoices%rowtype;
begin
  select * into v_invoice from public.invoices
  where reference = p_reference and amount = p_amount and currency = p_currency
    and account_number = p_account_number and status = 'pending'
    and billing_context = 'bmoni_tokens' and token_quantity > 0
    and amount = token_quantity * 5
  for update;
  if not found then return false; end if;

  insert into public.bmoni_settlements(event_id, transaction_id, invoice_id)
    values (p_event_id, p_transaction_id, v_invoice.id) on conflict do nothing;
  if not found then return false; end if;

  update public.invoices set status = 'settled', settled_at = now(),
    bmoni_transaction_id = p_transaction_id where id = v_invoice.id;
  insert into public.manufacturer_token_accounts(manufacturer_id, balance)
    values (v_invoice.manufacturer_id, v_invoice.token_quantity)
    on conflict (manufacturer_id) do update set
      balance = public.manufacturer_token_accounts.balance + excluded.balance;
  return true;
end;
$$;
revoke all on function public.settle_bmoni_sandbox_invoice(text,numeric,text,text,text,text) from public, anon, authenticated;
grant execute on function public.settle_bmoni_sandbox_invoice(text,numeric,text,text,text,text) to service_role;

create or replace function public.reserve_genuineng_batch_tokens(
  p_manufacturer_id uuid, p_batch_id uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_units integer; v_balance integer; v_existing integer;
begin
  select b.units_produced into v_units from public.batches b
  join public.products p on p.id = b.product_id
  where b.id = p_batch_id and p.manufacturer_id = p_manufacturer_id;
  if not found then raise exception 'Batch not found for manufacturer'; end if;

  insert into public.manufacturer_token_accounts(manufacturer_id, balance)
    values (p_manufacturer_id, 0) on conflict do nothing;
  select balance into v_balance from public.manufacturer_token_accounts
    where manufacturer_id = p_manufacturer_id for update;
  select quantity into v_existing from public.manufacturer_token_reservations
    where batch_id = p_batch_id;
  if found then return jsonb_build_object('reserved', true, 'balance', v_balance); end if;

  -- Codes already issued before this token migration are grandfathered.
  if exists (select 1 from public.unit_codes where batch_id = p_batch_id limit 1) then
    insert into public.manufacturer_token_reservations(batch_id, manufacturer_id, quantity)
      values (p_batch_id, p_manufacturer_id, 0);
    return jsonb_build_object('reserved', true, 'balance', v_balance);
  end if;
  if v_balance < v_units then
    return jsonb_build_object('reserved', false, 'balance', v_balance, 'required', v_units);
  end if;

  update public.manufacturer_token_accounts set balance = balance - v_units
    where manufacturer_id = p_manufacturer_id;
  insert into public.manufacturer_token_reservations(batch_id, manufacturer_id, quantity)
    values (p_batch_id, p_manufacturer_id, v_units);
  return jsonb_build_object('reserved', true, 'balance', v_balance - v_units);
end;
$$;
revoke all on function public.reserve_genuineng_batch_tokens(uuid,uuid) from public, anon, authenticated;
grant execute on function public.reserve_genuineng_batch_tokens(uuid,uuid) to service_role;

-- First genuine scan consumes only the individual code. Existing codes already
-- scanned under the old limit are treated as used, without erasing history.
alter table public.unit_codes add column if not exists used_at timestamptz;
alter table public.unit_codes drop constraint if exists unit_codes_status_check;
alter table public.unit_codes drop constraint if exists unit_codes_revocation_consistency;
update public.unit_codes set status = 'used', used_at = coalesce(revoked_at, now()),
  revoked_at = null, revoked_reason = null
where public_scan_count > 0 and (status = 'active' or revoked_reason = 'public_scan_limit');
alter table public.unit_codes add constraint unit_codes_status_check
  check (status in ('active', 'used', 'revoked'));
alter table public.unit_codes add constraint unit_codes_revocation_consistency check (
  (status = 'active' and used_at is null and revoked_at is null)
  or (status = 'used' and used_at is not null and revoked_at is null)
  or (status = 'revoked' and revoked_at is not null)
);

alter table public.verification_events drop constraint if exists verification_events_unit_status_after_check;
alter table public.verification_events add constraint verification_events_unit_status_after_check
  check (unit_status_after in ('active', 'used', 'revoked'));
alter table public.verification_events drop constraint if exists verification_events_reuse_status_check;
alter table public.verification_events alter column reuse_status drop not null;
alter table public.verification_events drop constraint if exists verification_public_number_check;
alter table public.code_scans drop constraint if exists code_scans_verdict_check;
alter table public.code_scans add constraint code_scans_verdict_check check (verdict in ('genuine', 'not_genuine', 'already_used'));
alter table public.code_scans drop constraint if exists code_scans_unit_status_check;
alter table public.code_scans add constraint code_scans_unit_status_check check (unit_status in ('active', 'used', 'revoked'));

create or replace function public.process_public_unit_scan(p_unit_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_unit public.unit_codes%rowtype; v_result text; v_status text;
begin
  select * into v_unit from public.unit_codes where unit_id = p_unit_id for update;
  if not found then return jsonb_build_object('found', false); end if;
  if v_unit.status = 'active' then
    update public.unit_codes set status = 'used', used_at = now(), public_scan_count = 1
      where id = v_unit.id;
    v_result := 'genuine'; v_status := 'used';
  elsif v_unit.status = 'used' then
    v_result := 'already_used'; v_status := 'used';
  else
    v_result := 'not_genuine'; v_status := 'revoked';
  end if;
  insert into public.verification_events(unit_id, actor_type, result, unit_status_after)
    values (p_unit_id, 'public', case when v_result = 'genuine' then 'genuine' else 'not_genuine' end, v_status);
  return jsonb_build_object('found', true, 'verdict', v_result, 'unitStatus', v_status);
end;
$$;
revoke all on function public.process_public_unit_scan(text) from public, anon, authenticated;
grant execute on function public.process_public_unit_scan(text) to service_role;
drop function if exists public.record_manufacturer_unit_scan(text,uuid);

-- Replace the old aggregate shape, which exposed reuse/revoked/public splits.
drop function if exists public.get_manufacturer_scan_activity(uuid);
create function public.get_manufacturer_scan_activity(p_manufacturer_id uuid)
returns table (batch_id uuid, batch_code text, product_name text, total_scans bigint)
language sql stable security invoker set search_path = public as $$
  select b.id, b.batch_code, p.name,
    count(ve.id) filter (where ve.actor_type = 'public')::bigint
  from public.batches b
  join public.products p on p.id = b.product_id
  join public.manufacturers m on m.id = p.manufacturer_id
  left join public.unit_codes uc on uc.batch_id = b.id
  left join public.verification_events ve on ve.unit_id = uc.unit_id
  where p.manufacturer_id = p_manufacturer_id
    and m.user_id = auth.uid() and m.approved = true
  group by b.id, b.batch_code, p.name, b.created_at
  order by b.created_at desc;
$$;
revoke all on function public.get_manufacturer_scan_activity(uuid) from public, anon;
grant execute on function public.get_manufacturer_scan_activity(uuid) to authenticated;

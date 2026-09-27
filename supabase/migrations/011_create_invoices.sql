-- supabase/migrations/011_create_invoices.sql
--
-- Layer 2 BMoni Payment Rails: Invoices & Smart Wallet reference

-- Add bmoni_smart_wallet_id to manufacturers table if not present
alter table if exists manufacturers
  add column if not exists bmoni_smart_wallet_id text;

-- Create invoices table
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid not null references manufacturers(id) on delete cascade,
  batch_id uuid references batches(id) on delete set null,
  reference text not null,
  amount numeric not null check (amount > 0),
  currency text not null default 'NGN',
  status text not null default 'pending' check (status in ('pending', 'settled', 'cancelled')),
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

-- Ensure reference is unique
create unique index if not exists invoices_reference_key
  on invoices (reference);

-- Indexes for performance
create index if not exists invoices_batch_id_idx
  on invoices (batch_id);

create index if not exists invoices_manufacturer_id_idx
  on invoices (manufacturer_id);

create index if not exists invoices_status_idx
  on invoices (status);

-- Enable Row Level Security
alter table invoices enable row level security;

-- Policy: Manufacturers can view only their own invoices
create policy "Manufacturers can read own invoices"
  on invoices for select
  using (
    manufacturer_id in (
      select id from manufacturers where user_id = auth.uid()
    )
  );

-- Policy: Authenticated manufacturers can insert invoices for their own account
create policy "Manufacturers can insert own invoices"
  on invoices for insert
  with check (
    manufacturer_id in (
      select id from manufacturers where user_id = auth.uid()
    )
  );

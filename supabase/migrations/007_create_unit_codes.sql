-- supabase/migrations/007_create_unit_codes.sql

create table if not exists unit_codes (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  unit_index integer not null,
  unit_id text not null,
  payload jsonb not null,
  signature text not null,
  key_version text not null,
  issued_at timestamptz not null default now()
);

-- unit_id is the human-readable {batch_code}-{unit_index} identifier
-- that's globally unique per our earlier decision (batch_code is
-- globally unique, so this holds as long as unit_index is unique
-- within a batch, enforced by the second constraint below).
create unique index if not exists unit_codes_unit_id_key
  on unit_codes (unit_id);

create unique index if not exists unit_codes_batch_id_unit_index_key
  on unit_codes (batch_id, unit_index);

create index if not exists unit_codes_batch_id_idx
  on unit_codes (batch_id);

-- Manufacturers can read their own issued codes (for export/CSV/scan
-- activity). No insert policy yet — deferred until generate-codes is
-- actually built, since who performs that insert (the manufacturer's
-- own session vs. a service-role backend process) isn't settled yet.
create policy "Manufacturers can read own unit codes"
  on unit_codes for select
  using (
    batch_id in (
      select b.id from batches b
      join products p on p.id = b.product_id
      where p.manufacturer_id in (
        select id from manufacturers where user_id = auth.uid()
      )
    )
  );

-- supabase/migrations/008_create_verification_events.sql

create table if not exists verification_events (
  id uuid primary key default gen_random_uuid(),
  unit_id text not null references unit_codes(unit_id) on delete cascade,
  scanned_at timestamptz not null default now(),
  was_online boolean not null default true,
  result text not null
);

create index if not exists verification_events_unit_id_idx
  on verification_events (unit_id);

-- Manufacturers can read verification events for their own units
-- (scan activity dashboard). No insert policy yet — see note below.
create policy "Manufacturers can read own verification events"
  on verification_events for select
  using (
    unit_id in (
      select uc.unit_id from unit_codes uc
      join batches b on b.id = uc.batch_id
      join products p on p.id = b.product_id
      where p.manufacturer_id in (
        select id from manufacturers where user_id = auth.uid()
      )
    )
  );

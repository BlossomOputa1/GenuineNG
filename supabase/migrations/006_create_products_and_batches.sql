-- supabase/migrations/006_create_products_and_batches.sql

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid not null references manufacturers(id) on delete cascade,
  name text not null,
  category text not null,
  nafdac_number text,
  created_at timestamptz not null default now()
);

create index if not exists products_manufacturer_id_idx
  on products (manufacturer_id);

create table if not exists batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  batch_code text not null,
  manufactured_date date not null,
  expiry_date date not null,
  units_produced integer not null check (units_produced > 0),
  created_at timestamptz not null default now()
);

-- Global uniqueness, not per-product — this is what makes
-- {batch_code}-{unit_index} collision-free as a unit_id across
-- the entire unit_codes table, not just within one product.
create unique index if not exists batches_batch_code_key
  on batches (batch_code);

create index if not exists batches_product_id_idx
  on batches (product_id);

-- Read-only RLS, scoped to ownership through the manufacturer_id /
-- product_id chain. Insert/update/delete policies are deliberately
-- deferred until the routes that need them are actually written —
-- see manufacturer.js POST /products and POST /batches.
create policy "Manufacturers can read own products"
  on products for select
  using (
    manufacturer_id in (
      select id from manufacturers where user_id = auth.uid()
    )
  );

create policy "Manufacturers can read own batches"
  on batches for select
  using (
    product_id in (
      select id from products
      where manufacturer_id in (
        select id from manufacturers where user_id = auth.uid()
      )
    )
  );

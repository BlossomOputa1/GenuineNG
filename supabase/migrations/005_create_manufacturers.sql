-- supabase/migrations/005_create_manufacturers.sql

create table if not exists manufacturers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  approved boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- One manufacturer profile per auth user
create unique index if not exists manufacturers_user_id_key
  on manufacturers (user_id);

-- manufacturerAuthMiddleware.js filters on approved = true for every
-- authenticated manufacturer-portal request, so this needs to be fast
create index if not exists manufacturers_approved_idx
  on manufacturers (user_id, approved);

-- GenuineNG Layer 1: profiles, scan sessions, scans and per-check results.
-- Run in the Supabase SQL editor or through the Supabase CLI.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scan_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New product check',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.scan_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_name text,
  manufacturer text,
  registration_number text,
  batch_number text,
  expiry_printed text,
  expiry_normalized date,
  ingredients text[] not null default '{}',
  verification_score integer check (verification_score between 0 and 100),
  score_band text check (score_band in ('good', 'medium', 'bad', 'insufficient')),
  recommendation text,
  limitation text,
  dataset_meta jsonb,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scan_checks (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  check_key text not null,
  status text not null check (status in ('match', 'warning', 'unverified', 'not_checked')),
  reason text not null,
  source text,
  coverage_note text,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(scan_id, check_key)
);

create index if not exists scan_sessions_user_updated_idx on public.scan_sessions(user_id, pinned desc, updated_at desc);
create index if not exists scans_session_created_idx on public.scans(session_id, created_at asc);
create index if not exists scan_checks_scan_idx on public.scan_checks(scan_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists scan_sessions_touch_updated_at on public.scan_sessions;
create trigger scan_sessions_touch_updated_at before update on public.scan_sessions
for each row execute function public.touch_updated_at();

drop trigger if exists scans_touch_updated_at on public.scans;
create trigger scans_touch_updated_at before update on public.scans
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.scan_sessions enable row level security;
alter table public.scans enable row level security;
alter table public.scan_checks enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "sessions_select_own" on public.scan_sessions;
drop policy if exists "sessions_insert_own" on public.scan_sessions;
drop policy if exists "sessions_update_own" on public.scan_sessions;
drop policy if exists "sessions_delete_own" on public.scan_sessions;
drop policy if exists "scans_select_own" on public.scans;
drop policy if exists "scans_insert_own" on public.scans;
drop policy if exists "scans_update_own" on public.scans;
drop policy if exists "scans_delete_own" on public.scans;
drop policy if exists "checks_select_own" on public.scan_checks;
drop policy if exists "checks_insert_own" on public.scan_checks;
drop policy if exists "checks_update_own" on public.scan_checks;
drop policy if exists "checks_delete_own" on public.scan_checks;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "sessions_select_own" on public.scan_sessions for select using (auth.uid() = user_id);
create policy "sessions_insert_own" on public.scan_sessions for insert with check (auth.uid() = user_id);
create policy "sessions_update_own" on public.scan_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions_delete_own" on public.scan_sessions for delete using (auth.uid() = user_id);

create policy "scans_select_own" on public.scans for select using (auth.uid() = user_id);
create policy "scans_insert_own" on public.scans for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.scan_sessions session
    where session.id = session_id and session.user_id = auth.uid()
  )
);
create policy "scans_update_own" on public.scans for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.scan_sessions session
    where session.id = session_id and session.user_id = auth.uid()
  )
);
create policy "scans_delete_own" on public.scans for delete using (auth.uid() = user_id);

create policy "checks_select_own" on public.scan_checks for select using (auth.uid() = user_id);
create policy "checks_insert_own" on public.scan_checks for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.scans scan
    where scan.id = scan_id and scan.user_id = auth.uid()
  )
);
create policy "checks_update_own" on public.scan_checks for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.scans scan
    where scan.id = scan_id and scan.user_id = auth.uid()
  )
);
create policy "checks_delete_own" on public.scan_checks for delete using (auth.uid() = user_id);

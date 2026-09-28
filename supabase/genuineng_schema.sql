-- GenuineNG clean baseline schema — Layer 1 + Layer 2.
-- Intended for a fresh Supabase database after genuineng_reset.sql.

begin;

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (full_name is null or length(trim(full_name)) between 1 and 100)
);

create table public.scan_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null default 'registry_label' check (mode in ('registry_label', 'genuine_code')),
  title text not null default 'New check',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scan_sessions_title_length check (length(trim(title)) between 1 and 80)
);

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.scan_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_name text,
  manufacturer_text text,
  registration_number text,
  expiry_printed text,
  expiry_normalized date,
  result_summary jsonb,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scans_product_length check (product_name is null or length(product_name) <= 300),
  constraint scans_manufacturer_length check (manufacturer_text is null or length(manufacturer_text) <= 300),
  constraint scans_registration_length check (registration_number is null or length(registration_number) <= 120),
  constraint scans_expiry_printed_length check (expiry_printed is null or length(expiry_printed) <= 80)
);

create table public.scan_checks (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  check_key text not null check (check_key in ('registration', 'expiry')),
  status text not null check (status in ('match', 'warning', 'unverified', 'not_checked')),
  reason text not null,
  source text,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (scan_id, check_key),
  constraint scan_checks_reason_length check (length(reason) <= 2500),
  constraint scan_checks_source_length check (source is null or length(source) <= 1000)
);

create table public.manufacturer_applications (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_person_name text not null,
  business_email text not null,
  phone_number text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  manufacturer_id uuid,
  approval_token_hash text,
  approval_token_expires_at timestamptz,
  approval_token_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint manufacturer_app_company_length check (length(trim(company_name)) between 2 and 160),
  constraint manufacturer_app_contact_length check (length(trim(contact_person_name)) between 2 and 120),
  constraint manufacturer_app_email_length check (length(trim(business_email)) between 5 and 254),
  constraint manufacturer_app_phone_length check (length(trim(phone_number)) between 7 and 40)
);

create unique index manufacturer_applications_pending_email_key
  on public.manufacturer_applications (lower(business_email))
  where status = 'pending';

create unique index manufacturer_applications_approval_token_hash_key
  on public.manufacturer_applications (approval_token_hash)
  where approval_token_hash is not null;

create table public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  action_path text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint user_notifications_type_length check (length(trim(type)) between 1 and 80),
  constraint user_notifications_title_length check (length(trim(title)) between 1 and 160),
  constraint user_notifications_message_length check (length(trim(message)) between 1 and 1200),
  constraint user_notifications_action_path_length check (action_path is null or length(action_path) <= 500)
);

create index user_notifications_user_created_idx on public.user_notifications (user_id, created_at desc);
create index user_notifications_unread_idx on public.user_notifications (user_id, created_at desc) where read_at is null;

create table public.manufacturers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  contact_person_name text,
  business_email text,
  phone_number text,
  approved boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.manufacturer_applications
  add constraint manufacturer_applications_manufacturer_id_fkey
  foreign key (manufacturer_id) references public.manufacturers(id) on delete set null;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid not null references public.manufacturers(id) on delete cascade,
  name text not null,
  category text not null,
  nafdac_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_name_length check (length(trim(name)) between 1 and 200),
  constraint products_category_length check (length(trim(category)) between 1 and 80),
  constraint products_nafdac_length check (nafdac_number is null or length(trim(nafdac_number)) <= 120)
);

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  batch_code text not null,
  manufactured_date date not null,
  expiry_date date not null,
  units_produced integer not null check (units_produced between 1 and 100000),
  created_at timestamptz not null default now(),
  unique (product_id, batch_code),
  constraint batches_date_order check (expiry_date >= manufactured_date),
  constraint batches_code_length check (length(trim(batch_code)) between 1 and 100)
);

create table public.unit_codes (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  unit_index integer not null check (unit_index between 1 and 100000),
  unit_id text not null unique,
  payload jsonb not null,
  signature text not null,
  key_version text not null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  public_scan_count integer not null default 0 check (public_scan_count >= 0),
  revoked_reason text,
  revoked_at timestamptz,
  issued_at timestamptz not null default now(),
  unique (batch_id, unit_index),
  constraint unit_codes_revocation_consistency check (
    (status = 'active' and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
  )
);

create table public.verification_events (
  id uuid primary key default gen_random_uuid(),
  unit_id text not null references public.unit_codes(unit_id) on delete cascade,
  actor_type text not null check (actor_type in ('public', 'manufacturer')),
  manufacturer_id uuid references public.manufacturers(id) on delete set null,
  result text not null check (result in ('genuine', 'not_genuine')),
  reuse_status text not null check (reuse_status in ('first_scan', 'previously_scanned', 'reuse_limit_reached', 'revoked', 'manufacturer_check')),
  public_scan_number integer,
  unit_status_after text not null check (unit_status_after in ('active', 'revoked')),
  was_online boolean not null default true,
  scanned_at timestamptz not null default now(),
  constraint verification_public_number_check check (
    (actor_type = 'public' and public_scan_number is not null and manufacturer_id is null)
    or (actor_type = 'manufacturer' and public_scan_number is null and manufacturer_id is not null)
  )
);

create table public.code_scans (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.scan_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id text,
  payload jsonb not null,
  signature text not null,
  signature_valid boolean not null,
  online_verified boolean not null default true,
  verdict text not null check (verdict in ('genuine', 'not_genuine')),
  reuse_status text not null default 'unavailable' check (reuse_status in ('first_scan', 'previously_scanned', 'reuse_limit_reached', 'revoked', 'manufacturer_check', 'unavailable')),
  public_scan_number integer,
  unit_status text check (unit_status in ('active', 'revoked')),
  reason text,
  product_name text,
  manufacturer_name text,
  batch_code text,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index scan_sessions_user_updated_idx on public.scan_sessions (user_id, pinned desc, updated_at desc);
create index scans_user_session_created_idx on public.scans (user_id, session_id, created_at);
create index scan_checks_scan_idx on public.scan_checks (scan_id);
create index code_scans_user_session_created_idx on public.code_scans (user_id, session_id, created_at);
create index products_manufacturer_idx on public.products (manufacturer_id, created_at desc);
create index batches_product_idx on public.batches (product_id, created_at desc);
create index unit_codes_batch_idx on public.unit_codes (batch_id, unit_index);
create index unit_codes_status_idx on public.unit_codes (status) where status = 'revoked';
create index verification_events_unit_scanned_idx on public.verification_events (unit_id, scanned_at desc);
create index verification_events_actor_idx on public.verification_events (actor_type, scanned_at desc);

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

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
create trigger scan_sessions_touch_updated_at before update on public.scan_sessions
for each row execute function public.touch_updated_at();
create trigger scans_touch_updated_at before update on public.scans
for each row execute function public.touch_updated_at();
create trigger manufacturer_applications_touch_updated_at before update on public.manufacturer_applications
for each row execute function public.touch_updated_at();
create trigger manufacturers_touch_updated_at before update on public.manufacturers
for each row execute function public.touch_updated_at();
create trigger products_touch_updated_at before update on public.products
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- The reset script intentionally keeps Supabase Auth users. Backfill profile rows
-- for any users that existed before this clean baseline was applied.
insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;

create or replace function public.prevent_scan_session_mode_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.mode is distinct from old.mode then
    raise exception 'scan session mode cannot be changed after creation';
  end if;
  return new;
end;
$$;

create trigger scan_sessions_lock_mode before update on public.scan_sessions
for each row execute function public.prevent_scan_session_mode_change();

create or replace function public.touch_scan_session_from_child()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.scan_sessions set updated_at = now() where id = new.session_id;
  return new;
end;
$$;

create trigger scans_touch_session after insert or update on public.scans
for each row execute function public.touch_scan_session_from_child();
create trigger code_scans_touch_session after insert or update on public.code_scans
for each row execute function public.touch_scan_session_from_child();

create or replace function public.save_label_scan(
  p_session_id uuid,
  p_title text,
  p_scan jsonb,
  p_checks jsonb,
  p_existing_scan_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid := p_session_id;
  v_scan_id uuid;
  v_mode text;
  v_check jsonb;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;

  if v_session_id is null then
    insert into public.scan_sessions(user_id, mode, title)
    values (v_user_id, 'registry_label', left(coalesce(nullif(trim(p_title), ''), 'New product check'), 80))
    returning id into v_session_id;
  else
    select mode into v_mode from public.scan_sessions
      where id = v_session_id and user_id = v_user_id for update;
    if v_mode is null then raise exception 'session not found'; end if;
    if v_mode <> 'registry_label' then raise exception 'session mode mismatch'; end if;
  end if;

  if p_existing_scan_id is not null and not exists (
    select 1 from public.scans
    where id = p_existing_scan_id and user_id = v_user_id and session_id = v_session_id
  ) then
    raise exception 'existing scan not found';
  end if;

  insert into public.scans(
    session_id, user_id, product_name, manufacturer_text, registration_number,
    expiry_printed, expiry_normalized, result_summary, checked_at
  ) values (
    v_session_id,
    v_user_id,
    nullif(p_scan->>'product_name', ''),
    nullif(p_scan->>'manufacturer_text', ''),
    nullif(p_scan->>'registration_number', ''),
    nullif(p_scan->>'expiry_printed', ''),
    nullif(p_scan->>'expiry_normalized', '')::date,
    p_scan->'result_summary',
    coalesce(nullif(p_scan->>'checked_at', '')::timestamptz, now())
  ) returning id into v_scan_id;

  for v_check in select value from jsonb_array_elements(coalesce(p_checks, '[]'::jsonb)) loop
    insert into public.scan_checks(scan_id, user_id, check_key, status, reason, source, checked_at)
    values (
      v_scan_id,
      v_user_id,
      v_check->>'check_key',
      v_check->>'status',
      coalesce(v_check->>'reason', ''),
      nullif(v_check->>'source', ''),
      nullif(v_check->>'checked_at', '')::timestamptz
    );
  end loop;

  if p_existing_scan_id is not null then
    delete from public.scans where id = p_existing_scan_id and user_id = v_user_id;
  end if;

  return jsonb_build_object('sessionId', v_session_id, 'scanId', v_scan_id);
end;
$$;

create or replace function public.save_code_scan(
  p_session_id uuid,
  p_title text,
  p_code jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid := p_session_id;
  v_scan_id uuid;
  v_mode text;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;

  if v_session_id is null then
    insert into public.scan_sessions(user_id, mode, title)
    values (v_user_id, 'genuine_code', left(coalesce(nullif(trim(p_title), ''), 'GenuineNG code'), 80))
    returning id into v_session_id;
  else
    select mode into v_mode from public.scan_sessions
      where id = v_session_id and user_id = v_user_id for update;
    if v_mode is null then raise exception 'session not found'; end if;
    if v_mode <> 'genuine_code' then raise exception 'session mode mismatch'; end if;
  end if;

  insert into public.code_scans(
    session_id, user_id, unit_id, payload, signature, signature_valid,
    online_verified, verdict, reuse_status, public_scan_number, unit_status,
    reason, product_name, manufacturer_name, batch_code, checked_at
  ) values (
    v_session_id,
    v_user_id,
    nullif(p_code->>'unit_id', ''),
    coalesce(p_code->'payload', '{}'::jsonb),
    coalesce(p_code->>'signature', ''),
    coalesce((p_code->>'signature_valid')::boolean, false),
    coalesce((p_code->>'online_verified')::boolean, true),
    p_code->>'verdict',
    coalesce(nullif(p_code->>'reuse_status', ''), 'unavailable'),
    nullif(p_code->>'public_scan_number', '')::integer,
    nullif(p_code->>'unit_status', ''),
    nullif(p_code->>'reason', ''),
    nullif(p_code->>'product_name', ''),
    nullif(p_code->>'manufacturer_name', ''),
    nullif(p_code->>'batch_code', ''),
    coalesce(nullif(p_code->>'checked_at', '')::timestamptz, now())
  ) returning id into v_scan_id;

  return jsonb_build_object('sessionId', v_session_id, 'scanId', v_scan_id);
end;
$$;

create or replace function public.process_public_unit_scan(p_unit_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit public.unit_codes%rowtype;
  v_scan_number integer;
  v_result text;
  v_reuse text;
  v_status_after text;
begin
  select * into v_unit from public.unit_codes where unit_id = p_unit_id for update;
  if not found then return jsonb_build_object('found', false); end if;

  v_scan_number := v_unit.public_scan_count + 1;

  if v_unit.status = 'revoked' then
    update public.unit_codes set public_scan_count = v_scan_number where id = v_unit.id;
    v_result := 'not_genuine';
    v_reuse := 'revoked';
    v_status_after := 'revoked';
  elsif v_scan_number = 1 then
    update public.unit_codes set public_scan_count = v_scan_number where id = v_unit.id;
    v_result := 'genuine';
    v_reuse := 'first_scan';
    v_status_after := 'active';
  elsif v_scan_number = 2 then
    update public.unit_codes set public_scan_count = v_scan_number where id = v_unit.id;
    v_result := 'genuine';
    v_reuse := 'previously_scanned';
    v_status_after := 'active';
  else
    update public.unit_codes
      set public_scan_count = v_scan_number,
          status = 'revoked',
          revoked_reason = 'public_scan_limit',
          revoked_at = now()
      where id = v_unit.id;
    v_result := 'genuine';
    v_reuse := 'reuse_limit_reached';
    v_status_after := 'revoked';
  end if;

  insert into public.verification_events(
    unit_id, actor_type, result, reuse_status, public_scan_number, unit_status_after
  ) values (
    p_unit_id, 'public', v_result, v_reuse, v_scan_number, v_status_after
  );

  return jsonb_build_object(
    'found', true,
    'verdict', v_result,
    'reuseStatus', v_reuse,
    'publicScanNumber', v_scan_number,
    'unitStatus', v_status_after
  );
end;
$$;

create or replace function public.record_manufacturer_unit_scan(
  p_unit_id text,
  p_manufacturer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_owner uuid;
  v_result text;
begin
  select uc.status, p.manufacturer_id into v_status, v_owner
  from public.unit_codes uc
  join public.batches b on b.id = uc.batch_id
  join public.products p on p.id = b.product_id
  where uc.unit_id = p_unit_id;

  if v_owner is null then return jsonb_build_object('found', false); end if;
  if v_owner <> p_manufacturer_id then raise exception 'manufacturer does not own this unit'; end if;

  v_result := case when v_status = 'active' then 'genuine' else 'not_genuine' end;
  insert into public.verification_events(
    unit_id, actor_type, manufacturer_id, result, reuse_status, unit_status_after
  ) values (
    p_unit_id, 'manufacturer', p_manufacturer_id, v_result, 'manufacturer_check', v_status
  );

  return jsonb_build_object(
    'found', true,
    'verdict', v_result,
    'reuseStatus', 'manufacturer_check',
    'publicScanNumber', null,
    'unitStatus', v_status
  );
end;
$$;

create or replace function public.get_manufacturer_product_stats(p_manufacturer_id uuid)
returns table (
  id uuid, name text, category text, nafdac_number text, created_at timestamptz,
  batch_count bigint, codes_issued bigint, scans bigint
)
language sql stable security invoker set search_path = public
as $$
  select p.id, p.name, p.category, p.nafdac_number, p.created_at,
    count(distinct b.id)::bigint,
    count(distinct uc.id)::bigint,
    count(distinct ve.id)::bigint
  from public.products p
  join public.manufacturers m on m.id = p.manufacturer_id
  left join public.batches b on b.product_id = p.id
  left join public.unit_codes uc on uc.batch_id = b.id
  left join public.verification_events ve on ve.unit_id = uc.unit_id
  where p.manufacturer_id = p_manufacturer_id
    and m.user_id = auth.uid() and m.approved = true
  group by p.id, p.name, p.category, p.nafdac_number, p.created_at
  order by p.created_at desc;
$$;

create or replace function public.get_manufacturer_batch_stats(p_manufacturer_id uuid)
returns table (
  id uuid, batch_code text, manufactured_date date, expiry_date date,
  units_produced integer, created_at timestamptz, product_id uuid,
  product_name text, codes_generated bigint
)
language sql stable security invoker set search_path = public
as $$
  select b.id, b.batch_code, b.manufactured_date, b.expiry_date,
    b.units_produced, b.created_at, b.product_id, p.name,
    count(uc.id)::bigint
  from public.batches b
  join public.products p on p.id = b.product_id
  join public.manufacturers m on m.id = p.manufacturer_id
  left join public.unit_codes uc on uc.batch_id = b.id
  where p.manufacturer_id = p_manufacturer_id
    and m.user_id = auth.uid() and m.approved = true
  group by b.id, b.batch_code, b.manufactured_date, b.expiry_date,
    b.units_produced, b.created_at, b.product_id, p.name
  order by b.created_at desc;
$$;

create or replace function public.get_manufacturer_scan_activity(p_manufacturer_id uuid)
returns table (
  batch_id uuid, batch_code text, product_name text, units_generated bigint,
  total_scans bigint, public_scans bigint, manufacturer_scans bigint,
  genuine_scans bigint, not_genuine_scans bigint, reuse_signals bigint,
  revoked_units bigint
)
language sql stable security invoker set search_path = public
as $$
  select b.id, b.batch_code, p.name,
    count(distinct uc.id)::bigint,
    count(distinct ve.id)::bigint,
    count(distinct ve.id) filter (where ve.actor_type = 'public')::bigint,
    count(distinct ve.id) filter (where ve.actor_type = 'manufacturer')::bigint,
    count(distinct ve.id) filter (where ve.result = 'genuine')::bigint,
    count(distinct ve.id) filter (where ve.result = 'not_genuine')::bigint,
    count(distinct ve.id) filter (where ve.reuse_status in ('previously_scanned','reuse_limit_reached','revoked'))::bigint,
    count(distinct uc.id) filter (where uc.status = 'revoked')::bigint
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

create or replace function public.queue_partner_application_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_notifications(kind, subject, payload)
  values (
    'manufacturer_application',
    'New manufacturer partner application',
    jsonb_build_object(
      'applicationId', new.id,
      'companyName', new.company_name,
      'contactPersonName', new.contact_person_name,
      'businessEmail', new.business_email,
      'phoneNumber', new.phone_number
    )
  );
  return new;
end;
$$;

create trigger manufacturer_application_notification
after insert on public.manufacturer_applications
for each row execute function public.queue_partner_application_notification();

create or replace function public.approve_manufacturer_application(
  p_application_id uuid,
  p_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_app public.manufacturer_applications%rowtype;
  v_user_id uuid := p_user_id;
  v_manufacturer_id uuid;
begin
  select * into v_app from public.manufacturer_applications where id = p_application_id for update;
  if not found then raise exception 'application not found'; end if;

  if v_user_id is null then
    select id into v_user_id from auth.users where lower(email) = lower(v_app.business_email) order by created_at asc limit 1;
  end if;
  if v_user_id is null then raise exception 'no Supabase Auth user exists for the application email'; end if;

  insert into public.manufacturers(
    user_id, company_name, contact_person_name, business_email, phone_number, approved, approved_at
  ) values (
    v_user_id, v_app.company_name, v_app.contact_person_name,
    lower(v_app.business_email), v_app.phone_number, true, now()
  )
  on conflict (user_id) do update set
    company_name = excluded.company_name,
    contact_person_name = excluded.contact_person_name,
    business_email = excluded.business_email,
    phone_number = excluded.phone_number,
    approved = true,
    approved_at = now()
  returning id into v_manufacturer_id;

  update public.manufacturer_applications
    set status = 'approved', reviewed_at = now(), manufacturer_id = v_manufacturer_id
    where id = p_application_id;

  return v_manufacturer_id;
end;
$$;

create or replace function public.approve_manufacturer_application_by_token(
  p_token_hash text
)
returns table (
  application_id uuid,
  manufacturer_id uuid,
  user_id uuid,
  company_name text,
  contact_person_name text,
  business_email text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_app public.manufacturer_applications%rowtype;
  v_user_id uuid;
  v_manufacturer_id uuid;
begin
  if p_token_hash is null or length(trim(p_token_hash)) < 32 then raise exception 'APPROVAL_TOKEN_INVALID'; end if;
  select * into v_app from public.manufacturer_applications where approval_token_hash = p_token_hash for update;
  if not found then raise exception 'APPROVAL_TOKEN_INVALID'; end if;
  if v_app.status <> 'pending' then raise exception 'APPLICATION_NOT_PENDING'; end if;
  if v_app.approval_token_used_at is not null then raise exception 'APPROVAL_TOKEN_USED'; end if;
  if v_app.approval_token_expires_at is null or v_app.approval_token_expires_at <= now() then raise exception 'APPROVAL_TOKEN_EXPIRED'; end if;

  select id into v_user_id from auth.users where lower(email) = lower(v_app.business_email) order by created_at asc limit 1;
  if v_user_id is null then raise exception 'NO_AUTH_USER'; end if;

  insert into public.manufacturers(user_id, company_name, contact_person_name, business_email, phone_number, approved, approved_at)
  values (v_user_id, v_app.company_name, v_app.contact_person_name, lower(v_app.business_email), v_app.phone_number, true, now())
  on conflict (user_id) do update set
    company_name = excluded.company_name, contact_person_name = excluded.contact_person_name, business_email = excluded.business_email,
    phone_number = excluded.phone_number, approved = true, approved_at = now(), updated_at = now()
  returning id into v_manufacturer_id;

  update public.manufacturer_applications set status = 'approved', reviewed_at = now(), manufacturer_id = v_manufacturer_id,
    approval_token_used_at = now(), updated_at = now() where id = v_app.id;

  insert into public.user_notifications(user_id, type, title, message, action_path)
  values (v_user_id, 'manufacturer_approved', 'Partner application approved',
    v_app.company_name || ' has been approved as a GenuineNG manufacturer partner. You can now access the Manufacturer Portal.', '/manufacturer');

  return query select v_app.id, v_manufacturer_id, v_user_id, v_app.company_name, v_app.contact_person_name, lower(v_app.business_email);
end;
$$;

alter table public.profiles enable row level security;
alter table public.scan_sessions enable row level security;
alter table public.scans enable row level security;
alter table public.scan_checks enable row level security;
alter table public.code_scans enable row level security;
alter table public.manufacturer_applications enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.user_notifications enable row level security;
alter table public.manufacturers enable row level security;
alter table public.products enable row level security;
alter table public.batches enable row level security;
alter table public.unit_codes enable row level security;
alter table public.verification_events enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using (auth.uid() = id);
create policy profiles_update_own on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy sessions_select_own on public.scan_sessions for select to authenticated using (auth.uid() = user_id);
create policy sessions_insert_own on public.scan_sessions for insert to authenticated with check (auth.uid() = user_id);
create policy sessions_update_own on public.scan_sessions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy sessions_delete_own on public.scan_sessions for delete to authenticated using (auth.uid() = user_id);

create policy scans_select_own on public.scans for select to authenticated using (auth.uid() = user_id);
create policy scans_insert_own on public.scans for insert to authenticated with check (
  auth.uid() = user_id and exists (
    select 1 from public.scan_sessions s where s.id = session_id and s.user_id = auth.uid() and s.mode = 'registry_label'
  )
);
create policy scans_update_own on public.scans for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy scans_delete_own on public.scans for delete to authenticated using (auth.uid() = user_id);

create policy scan_checks_select_own on public.scan_checks for select to authenticated using (auth.uid() = user_id);
create policy scan_checks_insert_own on public.scan_checks for insert to authenticated with check (
  auth.uid() = user_id and exists (
    select 1 from public.scans s where s.id = scan_id and s.user_id = auth.uid()
  )
);
create policy scan_checks_delete_own on public.scan_checks for delete to authenticated using (auth.uid() = user_id);

create policy code_scans_select_own on public.code_scans for select to authenticated using (auth.uid() = user_id);
create policy code_scans_insert_own on public.code_scans for insert to authenticated with check (
  auth.uid() = user_id and exists (
    select 1 from public.scan_sessions s where s.id = session_id and s.user_id = auth.uid() and s.mode = 'genuine_code'
  )
);
create policy code_scans_delete_own on public.code_scans for delete to authenticated using (auth.uid() = user_id);

-- Applications and admin notifications are service-role/backend only for this release.

create policy user_notifications_select_own on public.user_notifications for select to authenticated using (auth.uid() = user_id);
create policy user_notifications_update_own on public.user_notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy manufacturers_select_own on public.manufacturers for select to authenticated
using (user_id = auth.uid());

create policy products_select_own on public.products for select to authenticated using (
  exists (select 1 from public.manufacturers m where m.id = manufacturer_id and m.user_id = auth.uid() and m.approved)
);
create policy products_insert_own on public.products for insert to authenticated with check (
  exists (select 1 from public.manufacturers m where m.id = manufacturer_id and m.user_id = auth.uid() and m.approved)
);
create policy products_update_own on public.products for update to authenticated using (
  exists (select 1 from public.manufacturers m where m.id = manufacturer_id and m.user_id = auth.uid() and m.approved)
) with check (
  exists (select 1 from public.manufacturers m where m.id = manufacturer_id and m.user_id = auth.uid() and m.approved)
);

create policy batches_select_own on public.batches for select to authenticated using (
  exists (select 1 from public.products p join public.manufacturers m on m.id = p.manufacturer_id where p.id = product_id and m.user_id = auth.uid() and m.approved)
);
create policy batches_insert_own on public.batches for insert to authenticated with check (
  exists (select 1 from public.products p join public.manufacturers m on m.id = p.manufacturer_id where p.id = product_id and m.user_id = auth.uid() and m.approved)
);
create policy batches_update_own on public.batches for update to authenticated using (
  exists (select 1 from public.products p join public.manufacturers m on m.id = p.manufacturer_id where p.id = product_id and m.user_id = auth.uid() and m.approved)
) with check (
  exists (select 1 from public.products p join public.manufacturers m on m.id = p.manufacturer_id where p.id = product_id and m.user_id = auth.uid() and m.approved)
);

create policy unit_codes_select_own on public.unit_codes for select to authenticated using (
  exists (
    select 1 from public.batches b
    join public.products p on p.id = b.product_id
    join public.manufacturers m on m.id = p.manufacturer_id
    where b.id = batch_id and m.user_id = auth.uid() and m.approved
  )
);

create policy verification_events_select_own on public.verification_events for select to authenticated using (
  exists (
    select 1 from public.unit_codes uc
    join public.batches b on b.id = uc.batch_id
    join public.products p on p.id = b.product_id
    join public.manufacturers m on m.id = p.manufacturer_id
    where uc.unit_id = verification_events.unit_id and m.user_id = auth.uid() and m.approved
  )
);

revoke all on function public.save_label_scan(uuid,text,jsonb,jsonb,uuid) from public, anon;
grant execute on function public.save_label_scan(uuid,text,jsonb,jsonb,uuid) to authenticated;
revoke all on function public.save_code_scan(uuid,text,jsonb) from public, anon;
grant execute on function public.save_code_scan(uuid,text,jsonb) to authenticated;
revoke all on function public.get_manufacturer_product_stats(uuid) from public, anon;
grant execute on function public.get_manufacturer_product_stats(uuid) to authenticated;
revoke all on function public.get_manufacturer_batch_stats(uuid) from public, anon;
grant execute on function public.get_manufacturer_batch_stats(uuid) to authenticated;
revoke all on function public.get_manufacturer_scan_activity(uuid) from public, anon;
grant execute on function public.get_manufacturer_scan_activity(uuid) to authenticated;

revoke all on function public.process_public_unit_scan(text) from public, anon, authenticated;
grant execute on function public.process_public_unit_scan(text) to service_role;
revoke all on function public.record_manufacturer_unit_scan(text,uuid) from public, anon, authenticated;
grant execute on function public.record_manufacturer_unit_scan(text,uuid) to service_role;
revoke all on function public.approve_manufacturer_application(uuid,uuid) from public, anon, authenticated;
grant execute on function public.approve_manufacturer_application(uuid,uuid) to service_role;
revoke all on function public.approve_manufacturer_application_by_token(text) from public, anon, authenticated;
grant execute on function public.approve_manufacturer_application_by_token(text) to service_role;

commit;

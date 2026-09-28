-- Secure EmailJS partner approval links + in-app user notifications.
-- Safe to run after the GenuineNG baseline on an existing project.

begin;

alter table public.manufacturer_applications
  add column if not exists approval_token_hash text,
  add column if not exists approval_token_expires_at timestamptz,
  add column if not exists approval_token_used_at timestamptz;

create unique index if not exists manufacturer_applications_approval_token_hash_key
  on public.manufacturer_applications (approval_token_hash)
  where approval_token_hash is not null;

create table if not exists public.user_notifications (
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

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);
create index if not exists user_notifications_unread_idx
  on public.user_notifications (user_id, created_at desc)
  where read_at is null;

alter table public.user_notifications enable row level security;

drop policy if exists user_notifications_select_own on public.user_notifications;
create policy user_notifications_select_own
  on public.user_notifications for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists user_notifications_update_own on public.user_notifications;
create policy user_notifications_update_own
  on public.user_notifications for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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
  if p_token_hash is null or length(trim(p_token_hash)) < 32 then
    raise exception 'APPROVAL_TOKEN_INVALID';
  end if;

  select * into v_app
  from public.manufacturer_applications
  where approval_token_hash = p_token_hash
  for update;

  if not found then
    raise exception 'APPROVAL_TOKEN_INVALID';
  end if;
  if v_app.status <> 'pending' then
    raise exception 'APPLICATION_NOT_PENDING';
  end if;
  if v_app.approval_token_used_at is not null then
    raise exception 'APPROVAL_TOKEN_USED';
  end if;
  if v_app.approval_token_expires_at is null or v_app.approval_token_expires_at <= now() then
    raise exception 'APPROVAL_TOKEN_EXPIRED';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(v_app.business_email)
  order by created_at asc
  limit 1;

  if v_user_id is null then
    raise exception 'NO_AUTH_USER';
  end if;

  insert into public.manufacturers(
    user_id, company_name, contact_person_name, business_email, phone_number, approved, approved_at
  ) values (
    v_user_id,
    v_app.company_name,
    v_app.contact_person_name,
    lower(v_app.business_email),
    v_app.phone_number,
    true,
    now()
  )
  on conflict (user_id) do update set
    company_name = excluded.company_name,
    contact_person_name = excluded.contact_person_name,
    business_email = excluded.business_email,
    phone_number = excluded.phone_number,
    approved = true,
    approved_at = now(),
    updated_at = now()
  returning id into v_manufacturer_id;

  update public.manufacturer_applications
  set status = 'approved',
      reviewed_at = now(),
      manufacturer_id = v_manufacturer_id,
      approval_token_used_at = now(),
      updated_at = now()
  where id = v_app.id;

  insert into public.user_notifications(user_id, type, title, message, action_path)
  values (
    v_user_id,
    'manufacturer_approved',
    'Partner application approved',
    v_app.company_name || ' has been approved as a GenuineNG manufacturer partner. You can now access the Manufacturer Portal.',
    '/manufacturer'
  );

  return query
  select
    v_app.id,
    v_manufacturer_id,
    v_user_id,
    v_app.company_name,
    v_app.contact_person_name,
    lower(v_app.business_email);
end;
$$;

revoke all on function public.approve_manufacturer_application_by_token(text) from public, anon, authenticated;
grant execute on function public.approve_manufacturer_application_by_token(text) to service_role;

commit;

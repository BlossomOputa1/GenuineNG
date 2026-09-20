alter table public.profiles enable row level security;
alter table public.scans enable row level security;
alter table public.scan_checks enable row level security;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "scans_select_own"
on public.scans for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "scans_insert_own"
on public.scans for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "scans_delete_own"
on public.scans for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "scan_checks_select_own"
on public.scan_checks for select
to authenticated
using (
  exists (
    select 1 from public.scans s
    where s.id = scan_checks.scan_id
    and s.user_id = (select auth.uid())
  )
);

create policy "scan_checks_insert_own"
on public.scan_checks for insert
to authenticated
with check (
  exists (
    select 1 from public.scans s
    where s.id = scan_checks.scan_id
    and s.user_id = (select auth.uid())
  )
);

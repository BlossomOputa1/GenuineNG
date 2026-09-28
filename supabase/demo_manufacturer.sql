-- Demo manufacturer helper.
-- 1) Create the demo user in Supabase Auth first (email/password).
-- 2) Replace the email below and run this in the SQL editor.
-- This keeps Auth credentials out of source control.

insert into public.manufacturers (user_id, company_name, business_email, approved, approved_at)
select id, 'GenuineNG Demo Manufacturer', email, true, now()
from auth.users
where lower(email) = lower('demo-manufacturer@example.com')
on conflict (user_id) do update
set company_name = excluded.company_name,
    business_email = excluded.business_email,
    approved = true,
    approved_at = now();

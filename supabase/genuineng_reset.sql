-- GenuineNG application reset (keeps Supabase Auth users intact).
-- Run this before supabase/genuineng_schema.sql on an existing GenuineNG project.

begin;

drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.touch_updated_at() cascade;
drop function if exists public.touch_scan_session_from_child() cascade;
drop function if exists public.prevent_scan_session_mode_change() cascade;
drop function if exists public.save_label_scan(uuid,text,jsonb,jsonb,uuid) cascade;
drop function if exists public.save_code_scan(uuid,text,jsonb) cascade;
drop function if exists public.process_public_unit_scan(text) cascade;
drop function if exists public.record_manufacturer_unit_scan(text,uuid) cascade;
drop function if exists public.get_manufacturer_product_stats(uuid) cascade;
drop function if exists public.get_manufacturer_batch_stats(uuid) cascade;
drop function if exists public.get_manufacturer_scan_activity(uuid) cascade;
drop function if exists public.approve_manufacturer_application(uuid,uuid) cascade;
drop function if exists public.approve_manufacturer_application_by_token(text) cascade;
drop function if exists public.queue_partner_application_notification() cascade;
drop function if exists public.record_verification_event(text,text) cascade;
drop function if exists public.create_scan_with_checks(jsonb,jsonb) cascade;

drop table if exists public.user_notifications cascade;
drop table if exists public.admin_notifications cascade;
drop table if exists public.manufacturer_applications cascade;
drop table if exists public.code_scans cascade;
drop table if exists public.scan_checks cascade;
drop table if exists public.scans cascade;
drop table if exists public.scan_sessions cascade;
drop table if exists public.verification_events cascade;
drop table if exists public.unit_codes cascade;
drop table if exists public.batches cascade;
drop table if exists public.products cascade;
drop table if exists public.manufacturers cascade;
drop table if exists public.profiles cascade;

commit;

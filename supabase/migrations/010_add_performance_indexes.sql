-- Supporting indexes for authenticated scan pagination and RLS checks.
create index if not exists scans_user_created_id_idx
  on public.scans (user_id, created_at desc, id desc);

create index if not exists scan_checks_user_scan_idx
  on public.scan_checks (user_id, scan_id);

create index if not exists verification_events_unit_scanned_idx
  on public.verification_events (unit_id, scanned_at desc);

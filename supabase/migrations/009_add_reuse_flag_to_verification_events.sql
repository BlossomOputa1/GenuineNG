-- Stores the reuse outcome reuseDetector.js computed at scan time,
-- rather than only returning it transiently in the verify-code
-- response. Without this, scan-activity has no way to report reuse
-- signals per batch — the information existed for one request and
-- was then lost.
alter table verification_events
  add column if not exists reuse_status text;

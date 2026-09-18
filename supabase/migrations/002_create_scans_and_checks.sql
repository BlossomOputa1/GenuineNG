create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  matched_product_id uuid null,
  manufacturer_text text null,
  registration_number text null,
  batch_number text null,
  expiry_date date null,
  ingredients_text text null,
  result_summary jsonb null,
  created_at timestamptz not null default now(),
  constraint scans_manufacturer_text_length check (manufacturer_text is null or length(manufacturer_text) <= 500),
  constraint scans_registration_number_length check (registration_number is null or length(registration_number) <= 100),
  constraint scans_batch_number_length check (batch_number is null or length(batch_number) <= 100),
  constraint scans_ingredients_text_length check (ingredients_text is null or length(ingredients_text) <= 10000)
);

create table public.scan_checks (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans(id) on delete cascade,
  check_type text not null,
  outcome text not null,
  reason text null,
  source_name text null,
  source_url text null,
  source_last_checked_at timestamptz null,
  checked_at timestamptz not null default now(),
  constraint scan_checks_type_check
    check (check_type in ('registration', 'expiry', 'recall', 'ingredients')),
  constraint scan_checks_outcome_check
    check (outcome in ('match', 'warning', 'not_checked', 'unverified')),
  constraint scan_checks_reason_length check (reason is null or length(reason) <= 2000),
  constraint scan_checks_source_url_length check (source_url is null or length(source_url) <= 2000)
);

create index scans_user_id_created_at_idx
  on public.scans (user_id, created_at desc);

create index scan_checks_scan_id_idx
  on public.scan_checks (scan_id);

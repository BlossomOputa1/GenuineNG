create or replace function public.create_scan_with_checks(
  p_matched_product_id uuid,
  p_manufacturer_text text,
  p_registration_number text,
  p_batch_number text,
  p_expiry_date date,
  p_ingredients_text text,
  p_result_summary jsonb,
  p_checks jsonb
)
returns public.scans
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_scan public.scans;
begin
  insert into public.scans (
    user_id, matched_product_id, manufacturer_text, registration_number,
    batch_number, expiry_date, ingredients_text, result_summary
  ) values (
    auth.uid(), p_matched_product_id, p_manufacturer_text, p_registration_number,
    p_batch_number, p_expiry_date, p_ingredients_text, p_result_summary
  )
  returning * into v_scan;

  if p_checks is not null and jsonb_array_length(p_checks) > 0 then
    insert into public.scan_checks (
      scan_id, check_type, outcome, reason, source_name, source_url, source_last_checked_at
    )
    select
      v_scan.id,
      c->>'check_type',
      c->>'outcome',
      c->>'reason',
      c->>'source_name',
      c->>'source_url',
      (c->>'source_last_checked_at')::timestamptz
    from jsonb_array_elements(p_checks) as c;
  end if;

  return v_scan;
end;
$$;

grant execute on function public.create_scan_with_checks to authenticated;

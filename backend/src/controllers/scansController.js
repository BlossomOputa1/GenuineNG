import { validateScanInput } from '../validators/scanInputValidator.js';

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 50;

export async function listScans(req, res) {
  const limit = Math.min(
    parseInt(req.query.limit) || PAGE_SIZE_DEFAULT,
    PAGE_SIZE_MAX
  );
  const cursor = req.query.cursor || null;

  let query = req.supabase
    .from('scans')
    .select(
      'id, created_at, manufacturer_text, registration_number, batch_number, expiry_date'
    )
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    return res
      .status(500)
      .json({
        error: { code: 'SCANS_LIST_FAILED', message: 'Could not list scans.' },
      });
  }

  const nextCursor =
    data.length === limit ? data[data.length - 1].created_at : null;
  res.json({ data, next_cursor: nextCursor });
}

export async function getScan(req, res) {
  const { id } = req.params;

  const { data: scan, error: scanError } = await req.supabase
    .from('scans')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (scanError || !scan) {
    return res
      .status(404)
      .json({ error: { code: 'SCAN_NOT_FOUND', message: 'Scan not found.' } });
  }

  const { data: checks, error: checksError } = await req.supabase
    .from('scan_checks')
    .select('*')
    .eq('scan_id', id);

  if (checksError) {
    return res
      .status(500)
      .json({
        error: {
          code: 'CHECKS_FETCH_FAILED',
          message: 'Could not load check details.',
        },
      });
  }

  res.json({ ...scan, checks });
}

export async function createScan(req, res) {
  const { valid, errors } = validateScanInput(req.body);

  if (!valid) {
    return res
      .status(400)
      .json({ error: { code: 'INVALID_INPUT', message: errors.join(' ') } });
  }

  const body = req.body;

  // Explicit allow-list — never spread req.body directly. user_id comes
  // only from the authenticated identity, never from the request.
  const scanPayload = {
    user_id: req.user.id,
    matched_product_id: body.matched_product_id ?? null,
    manufacturer_text: body.manufacturer_text ?? null,
    registration_number: body.registration_number ?? null,
    batch_number: body.batch_number ?? null,
    expiry_date: body.expiry_date ?? null,
    ingredients_text: body.ingredients_text ?? null,
    result_summary: body.result_summary ?? null,
  };

  const { data: scan, error: scanError } = await req.supabase
    .from('scans')
    .insert(scanPayload)
    .select()
    .single();

  if (scanError || !scan) {
    return res
      .status(500)
      .json({
        error: { code: 'SCAN_CREATE_FAILED', message: 'Could not save scan.' },
      });
  }

  if (Array.isArray(body.checks) && body.checks.length > 0) {
    const checkRows = body.checks.map((c) => ({
      scan_id: scan.id,
      check_type: c.check_type,
      outcome: c.outcome,
      reason: c.reason ?? null,
      source_name: c.source_name ?? null,
      source_url: c.source_url ?? null,
      source_last_checked_at: c.source_last_checked_at ?? null,
    }));

    const { error: checksError } = await req.supabase
      .from('scan_checks')
      .insert(checkRows);

    if (checksError) {
      // Known limitation: not wrapped in a DB transaction yet — the scan
      // row can exist without its checks if this insert fails. Acceptable
      // for MVP scope; a Postgres function would make this atomic later.
      return res
        .status(500)
        .json({
          error: {
            code: 'CHECKS_CREATE_FAILED',
            message: 'Scan saved, but check details failed to save.',
          },
        });
    }
  }

  res.status(201).json(scan);
}

export async function deleteScan(req, res) {
  const { id } = req.params;

  const { data, error } = await req.supabase
    .from('scans')
    .delete()
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    return res
      .status(500)
      .json({
        error: {
          code: 'SCAN_DELETE_FAILED',
          message: 'Could not delete scan.',
        },
      });
  }

  if (!data) {
    return res
      .status(404)
      .json({ error: { code: 'SCAN_NOT_FOUND', message: 'Scan not found.' } });
  }

  res.status(204).send();
}

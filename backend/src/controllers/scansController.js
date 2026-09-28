import { validateScanInput } from '../validators/scanInputValidator.js';

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 50;
const SCAN_COLUMNS =
  'id, session_id, user_id, product_name, manufacturer_text, registration_number, batch_number, expiry_printed, expiry_normalized, result_summary, checked_at, created_at, updated_at';
const CHECK_COLUMNS =
  'id, scan_id, user_id, check_key, status, reason, source, checked_at, created_at';

function requireRequestContext(req, res) {
  if (!req.user?.id || !req.supabase) {
    res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authenticated scan access is required.',
      },
    });
    return false;
  }
  return true;
}

export async function listScans(req, res) {
  if (!requireRequestContext(req, res)) return;
  try {
    const requested = Number.parseInt(req.query?.limit, 10);
    const limit = Math.min(
      Number.isFinite(requested) && requested > 0 ? requested : PAGE_SIZE_DEFAULT,
      PAGE_SIZE_MAX
    );
    const sessionId =
      typeof req.query?.session_id === 'string' ? req.query.session_id.trim() : null;
    const includeChecks = req.query?.include === 'checks';
    let query = req.supabase
      .from('scans')
      .select(
        includeChecks
          ? `${SCAN_COLUMNS}, checks:scan_checks(${CHECK_COLUMNS})`
          : SCAN_COLUMNS
      )
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);
    if (sessionId) query = query.eq('session_id', sessionId);
    const { data = [], error } = await query;
    if (error) throw error;
    return res.json({ data });
  } catch (error) {
    console.error('Failed to list scans:', error);
    return res.status(500).json({
      error: { code: 'SCANS_LIST_FAILED', message: 'Could not list scans.' },
    });
  }
}

export async function getScan(req, res) {
  if (!requireRequestContext(req, res)) return;
  try {
    const id = String(req.params?.id || '').trim();
    const { data: scan, error } = await req.supabase
      .from('scans')
      .select(SCAN_COLUMNS)
      .eq('user_id', req.user.id)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!scan)
      return res.status(404).json({
        error: { code: 'SCAN_NOT_FOUND', message: 'Scan not found.' },
      });
    const { data: checks = [], error: checksError } = await req.supabase
      .from('scan_checks')
      .select(CHECK_COLUMNS)
      .eq('scan_id', id)
      .order('created_at');
    if (checksError) throw checksError;
    return res.json({ ...scan, checks });
  } catch (error) {
    console.error('Failed to load scan:', error);
    return res.status(500).json({
      error: { code: 'SCAN_FETCH_FAILED', message: 'Could not load scan.' },
    });
  }
}

export async function createScan(req, res) {
  if (!requireRequestContext(req, res)) return;
  try {
    const { valid, errors } = validateScanInput(req.body);
    if (!valid) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: errors.join(' ') },
      });
    }

    const body = req.body;
    const checks = (body.checks || []).map((check) => ({
      check_key: check.check_key ?? check.check_type,
      status: check.status ?? check.outcome,
      reason: check.reason || '',
      source: check.source ?? check.source_name ?? null,
      checked_at: check.checked_at ?? check.source_last_checked_at ?? null,
    }));

    const scan = {
      product_name: body.product_name ?? null,
      manufacturer_text: body.manufacturer_text ?? body.manufacturer ?? null,
      registration_number: body.registration_number ?? null,
      batch_number: body.batch_number ?? body.batchNumber ?? null,
      expiry_printed: body.expiry_printed ?? body.expiryDate ?? null,
      expiry_normalized: body.expiry_normalized ?? body.expiry_date ?? null,
      result_summary: body.result_summary ?? null,
      checked_at: body.checked_at ?? null,
    };

    const { data, error } = await req.supabase.rpc('save_label_scan', {
      p_session_id: body.session_id ?? body.sessionId ?? null,
      p_title: body.title ?? body.product_name ?? 'New product check',
      p_scan: scan,
      p_checks: checks,
      p_existing_scan_id: body.existing_scan_id ?? null,
    });

    if (error) {
      console.error('RPC save_label_scan failed:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }

    return res.status(201).json({ id: data.scanId, session_id: data.sessionId });
  } catch (error) {
    console.error('Failed to save scan atomically:', error);
    return res.status(500).json({
      error: {
        code: 'SCAN_CREATE_FAILED',
        message: 'Could not save this check to history.',
      },
    });
  }
}

export async function deleteScan(req, res) {
  if (!requireRequestContext(req, res)) return;
  try {
    const id = String(req.params?.id || '').trim();
    const { data, error } = await req.supabase
      .from('scans')
      .delete()
      .eq('user_id', req.user.id)
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data)
      return res.status(404).json({
        error: { code: 'SCAN_NOT_FOUND', message: 'Scan not found.' },
      });
    return res.status(204).send();
  } catch (error) {
    console.error('Failed to delete scan:', error);
    return res.status(500).json({
      error: { code: 'SCAN_DELETE_FAILED', message: 'Could not delete scan.' },
    });
  }
}
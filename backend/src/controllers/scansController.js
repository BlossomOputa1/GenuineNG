import { validateScanInput } from '../validators/scanInputValidator.js';

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 50;

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
    const requestedLimit = Number.parseInt(req.query?.limit, 10);
    const limit = Math.min(
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? requestedLimit
        : PAGE_SIZE_DEFAULT,
      PAGE_SIZE_MAX
    );
    const cursor = typeof req.query?.cursor === 'string' ? req.query.cursor : null;

    let query = req.supabase
      .from('scans')
      .select(
        'id, session_id, user_id, product_name, manufacturer, manufacturer_text, registration_number, batch_number, expiry_printed, expiry_normalized, ingredients, verification_score, score_band, recommendation, limitation, dataset_meta, checked_at, created_at, updated_at'
      )
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);

    if (cursor) query = query.lt('created_at', cursor);

    const { data = [], error } = await query;
    if (error) {
      console.error('Failed to list scans:', error);
      return res.status(500).json({
        error: { code: 'SCANS_LIST_FAILED', message: 'Could not list scans.' },
      });
    }

    const lastRow = data.at(-1);
    const nextCursor = data.length === limit ? lastRow?.created_at || null : null;
    return res.json({ data, next_cursor: nextCursor });
  } catch (error) {
    console.error('Scan fetch error:', error);
    console.error('Unexpected scan list error:', error);
    return res.status(500).json({
      error: { code: 'SCANS_LIST_FAILED', message: 'Could not list scans.' },
    });
  }
}

export async function getScan(req, res) {
  if (!requireRequestContext(req, res)) return;
  try {
    const id = typeof req.params?.id === 'string' ? req.params.id.trim() : '';
    if (!id) {
      return res.status(400).json({
        error: { code: 'SCAN_ID_REQUIRED', message: 'Scan id is required.' },
      });
    }

    const { data: scan, error: scanError } = await req.supabase
      .from('scans')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('id', id)
      .maybeSingle();

    if (scanError) {
      console.error('Failed to load scan:', scanError);
      return res.status(500).json({
        error: { code: 'SCAN_FETCH_FAILED', message: 'Could not load scan.' },
      });
    }
    if (!scan) {
      return res.status(404).json({
        error: { code: 'SCAN_NOT_FOUND', message: 'Scan not found.' },
      });
    }

    const { data: checks = [], error: checksError } = await req.supabase
      .from('scan_checks')
      .select('*')
      .eq('scan_id', id);

    if (checksError) {
      console.error('Failed to load scan checks:', checksError);
      return res.status(500).json({
        error: { code: 'CHECKS_FETCH_FAILED', message: 'Could not load check details.' },
      });
    }

    return res.json({ ...scan, checks });
  } catch (error) {
    console.error('Scan fetch error:', error);
    console.error('Unexpected scan detail error:', error);
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
    const sessionId = body.session_id ?? body.sessionId ?? null;

    if (!sessionId) {
      return res.status(400).json({
        error: {
          code: 'SESSION_ID_REQUIRED',
          message: 'session_id is required to save a scan.',
        },
      });
    }

    const scanRow = {
      session_id: sessionId,
      user_id: req.user.id,
      product_name: body.product_name ?? body.productName ?? null,
      manufacturer: body.manufacturer ?? null,
      manufacturer_text: body.manufacturer_text ?? null,
      registration_number: body.registration_number ?? null,
      batch_number: body.batch_number ?? null,
      expiry_printed: body.expiry_printed ?? body.expiryDate ?? null,
      expiry_normalized: body.expiry_normalized ?? body.expiry_date ?? null,
      ingredients: body.ingredients ?? body.ingredients_text ?? null,
      verification_score: body.verification_score ?? body.verificationScore ?? null,
      score_band: body.score_band ?? body.scoreBand ?? null,
      recommendation: body.recommendation ?? body.result_summary?.verdict ?? null,
      limitation: body.limitation ?? null,
      dataset_meta: body.dataset_meta ?? null,
      checked_at: body.checked_at ?? null,
    };

    const { data: scan, error } = await req.supabase
      .from('scans')
      .insert(scanRow)
      .select('*')
      .single();

    if (error || !scan) {
      console.error('Failed to create scan:', error);
      return res.status(500).json({
        error: { code: 'SCAN_CREATE_FAILED', message: 'Could not save scan.' },
      });
    }

    if (Array.isArray(body.checks) && body.checks.length > 0) {
      const checkRows = body.checks.map((check) => ({
        scan_id: scan.id,
        user_id: req.user.id,
        check_key: check.check_key ?? check.check_type,
        status: check.status ?? check.outcome,
        reason: check.reason ?? '',
        source: check.source ?? check.source_name ?? null,
        checked_at: check.checked_at ?? check.source_last_checked_at ?? null,
      }));
      const { error: checksError } = await req.supabase
        .from('scan_checks')
        .insert(checkRows);
      if (checksError) {
        console.error('Failed to save scan checks:', checksError);
        return res.status(500).json({
          error: { code: 'CHECKS_CREATE_FAILED', message: 'Could not save scan checks.' },
        });
      }
    }

    return res.status(201).json(scan);
  } catch (error) {
    console.error('Unexpected scan creation error:', error);
    return res.status(500).json({
      error: { code: 'SCAN_CREATE_FAILED', message: 'Could not save scan.' },
    });
  }
}

export async function deleteScan(req, res) {
  if (!requireRequestContext(req, res)) return;
  try {
    const id = typeof req.params?.id === 'string' ? req.params.id.trim() : '';
    if (!id) {
      return res.status(400).json({
        error: { code: 'SCAN_ID_REQUIRED', message: 'Scan id is required.' },
      });
    }

    const { data, error } = await req.supabase
      .from('scans')
      .delete()
      .eq('user_id', req.user.id)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Failed to delete scan:', error);
      return res.status(500).json({
        error: { code: 'SCAN_DELETE_FAILED', message: 'Could not delete scan.' },
      });
    }
    if (!data) {
      return res.status(404).json({
        error: { code: 'SCAN_NOT_FOUND', message: 'Scan not found.' },
      });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('Unexpected scan deletion error:', error);
    return res.status(500).json({
      error: { code: 'SCAN_DELETE_FAILED', message: 'Could not delete scan.' },
    });
  }
}

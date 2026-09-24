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
        'id, created_at, manufacturer_text, registration_number, batch_number, expiry_date'
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

    const { data: scan, error } = await req.supabase.rpc(
      'create_scan_with_checks',
      {
        p_matched_product_id: body.matched_product_id ?? null,
        p_manufacturer_text: body.manufacturer_text ?? null,
        p_registration_number: body.registration_number ?? null,
        p_batch_number: body.batch_number ?? null,
        p_expiry_date: body.expiry_date ?? null,
        p_ingredients_text: body.ingredients_text ?? null,
        p_result_summary: body.result_summary ?? null,
        p_checks: body.checks ?? null,
      }
    );

    if (error || !scan) {
      console.error('Failed to create scan:', error);
      return res.status(500).json({
        error: { code: 'SCAN_CREATE_FAILED', message: 'Could not save scan.' },
      });
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

import {
  validateProductInput,
  validateBatchInput,
} from '../validators/manufacturerValidators.js';
import {
  createProduct,
  getProductsForManufacturer,
} from '../services/productService.js';
import {
  createBatch,
  getBatchesForManufacturer,
} from '../services/batchService.js';
import { generateCodesForBatch } from '../services/codeGenerationService.js';
import { getScanActivity } from '../services/scanActivityService.js';
import {
  sendCsvExport,
  sendManifestExport,
  streamQrZipExport,
} from '../services/exportService.js';

export async function registerProduct(req, res, next) {
  try {
    const { valid, errors, data } = validateProductInput(req.body);

    if (!valid) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid product data.',
          details: errors,
        },
      });
    }

    const product = await createProduct({
      supabase: req.supabase,
      manufacturerId: req.manufacturer.id,
      ...data,
    });

    return res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
}

export async function listProductsController(req, res, next) {
  try {
    // Read-only aggregate — same RLS-scoped req.supabase pattern as
    // registerProduct above.
    const products = await getProductsForManufacturer({
      supabase: req.supabase,
      manufacturerId: req.manufacturer.id,
    });

    return res.status(200).json({ products });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        error: { code: err.code || 'ERROR', message: err.message },
      });
    }
    next(err);
  }
}

export async function createBatchController(req, res, next) {
  try {
    const { valid, errors, data } = validateBatchInput(req.body);

    if (!valid) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid batch data.',
          details: errors,
        },
      });
    }

    const batch = await createBatch({
      supabase: req.supabase,
      manufacturerId: req.manufacturer.id,
      ...data,
    });

    return res.status(201).json({ batch });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        error: { code: err.code || 'ERROR', message: err.message },
      });
    }
    next(err);
  }
}

export async function listBatchesController(req, res, next) {
  try {
    // Read-only aggregate — same RLS-scoped req.supabase pattern as
    // createBatchController above.
    const batches = await getBatchesForManufacturer({
      supabase: req.supabase,
      manufacturerId: req.manufacturer.id,
    });

    return res.status(200).json({ batches });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        error: { code: err.code || 'ERROR', message: err.message },
      });
    }
    next(err);
  }
}

export async function generateCodesController(req, res, next) {
  try {
    const { id: batchId } = req.params;

    if (!batchId) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Batch id is required in the URL.',
        },
      });
    }

    // codeGenerationService.js imports its own service-role Supabase
    // client internally (bypasses RLS by design — see
    // LAYER2_PROGRESS.md "Why unit_codes has no insert policy").
    // Unlike registerProduct/createBatchController above, this does
    // NOT pass req.supabase — that would be the wrong client for a
    // bulk insert that already passed authorization in
    // manufacturerAuthMiddleware.
    const { data: invoice, error: invoiceError } = await req.supabase
      .from('invoices')
      .select('id, status, amount, currency, settled_at')
      .eq('batch_id', batchId)
      .eq('manufacturer_id', req.manufacturer.id)
      .order('created_at', { ascending: false})
      .limit(1)
      .maybeSingle();
    if (invoiceError) {
      return res.status(500).json({
        error: {
          code: 'PAYMENT_CHECK_FAILED',
          message: 'Failed to verify payment status for this batch',
        },
      });
    }
    // enforce 402 payment required if no invoice or invoice is still pending
    if (!invoice || invoice.status !== 'settled'){
      return res.status(402).json({
        error: {
          code: 'PAYMENT_REQUIRED',
          message: 'Payment has not been settled for this batch.',
          invoiceStatus: invoice ? invoice.status : 'unbilled',
          batchId,
        },
      });
    }
    const result = await generateCodesForBatch({
      manufacturerId: req.manufacturer.id,
      batchId,
    });

    return res.status(201).json({ result });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        error: { code: err.code || 'ERROR', message: err.message },
      });
    }
    next(err);
  }
}

export async function scanActivityController(req, res, next) {
  try {
    // Read-only aggregate of the manufacturer's own data — uses
    // req.supabase (RLS-scoped), same pattern as registerProduct/
    // createBatchController above, unlike generateCodesController.
    const activity = await getScanActivity({
      supabase: req.supabase,
      manufacturerId: req.manufacturer.id,
    });

    return res.status(200).json({ activity });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        error: { code: err.code || 'ERROR', message: err.message },
      });
    }
    next(err);
  }
}

const VALID_EXPORT_FORMATS = ['csv', 'manifest', 'qr-zip'];

export async function exportBatchController(req, res, next) {
  try {
    const { id: batchId } = req.params;
    const { format } = req.query;

    if (!batchId) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Batch id is required in the URL.',
        },
      });
    }

    if (!format || !VALID_EXPORT_FORMATS.includes(format)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: `format query param is required and must be one of: ${VALID_EXPORT_FORMATS.join(', ')}.`,
        },
      });
    }

    const shared = {
      supabase: req.supabase,
      manufacturerId: req.manufacturer.id,
      batchId,
      res,
    };

    // Each function streams directly to res (no res.json() on
    // success). If one throws AFTER streaming has already started,
    // this catch block's res.status().json() won't work cleanly —
    // headers are already sent. Same known limitation as before, see
    // LAYER2_PROGRESS.md.
    if (format === 'csv') {
      await sendCsvExport(shared);
    } else if (format === 'manifest') {
      await sendManifestExport(shared);
    } else {
      await streamQrZipExport(shared);
    }
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        error: { code: err.code || 'ERROR', message: err.message },
      });
    }
    next(err);
  }
}

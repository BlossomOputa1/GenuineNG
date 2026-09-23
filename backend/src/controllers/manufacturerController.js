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
import { buildBatchExportStream } from '../services/exportService.js';

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

export async function exportBatchController(req, res, next) {
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

    // buildBatchExportStream writes directly to res (streaming ZIP) —
    // it does not return JSON, so there is no res.json() call here
    // on success. Note: if it throws AFTER streaming has already
    // started, this catch block's res.status().json() will not work
    // cleanly, since headers are already sent — see LAYER2_PROGRESS.md.
    await buildBatchExportStream({
      supabase: req.supabase,
      manufacturerId: req.manufacturer.id,
      batchId,
      res,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        error: { code: err.code || 'ERROR', message: err.message },
      });
    }
    next(err);
  }
}

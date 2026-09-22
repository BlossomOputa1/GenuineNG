import {
  validateProductInput,
  validateBatchInput,
} from '../validators/manufacturerValidators.js';
import { createProduct } from '../services/productService.js';
import { createBatch } from '../services/batchService.js';
import { generateCodesForBatch } from '../services/codeGenerationService.js';

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

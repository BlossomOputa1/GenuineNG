import {
  validateProductInput,
  validateBatchInput,
} from '../validators/manufacturerValidators.js';
import { createProduct } from '../services/productService.js';
import { createBatch } from '../services/batchService.js';

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

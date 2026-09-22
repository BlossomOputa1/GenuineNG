import { validateProductInput } from '../validators/manufacturerValidators.js';
import { createProduct } from '../services/productService.js';

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

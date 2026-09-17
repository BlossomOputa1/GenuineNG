import { validateLabelInput } from '../validators/labelInputValidator.js';

/**
 * Boundary validation. Runs before any controller/service logic.
 * Rejects malformed requests with a 400 and does not leak internals.
 */
export function validateLabelChecksRequest(req, res, next) {
  const { valid, errors } = validateLabelInput(req.body);

  if (!valid) {
    return res.status(400).json({
      status: 'error',
      reason: 'Invalid request body.',
      details: errors,
    });
  }

  next();
}

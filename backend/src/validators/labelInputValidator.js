/**
 * Validates the shape/type of incoming label data before it reaches
 * the service layer. This is format/type validation only — it does
 * NOT verify authenticity. A syntactically valid registration number
 * can still fail verification downstream.
 */
export function validateLabelInput(body) {
  const errors = [];

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, errors: ['Request body must be a JSON object.'] };
  }

  const {
    manufacturer,
    registrationNumber,
    batchNumber,
    expiryDate,
    ingredients,
  } = body;

  if (
    manufacturer !== undefined &&
    manufacturer !== null &&
    typeof manufacturer !== 'string'
  ) {
    errors.push('manufacturer must be a string or null.');
  }

  if (
    registrationNumber !== undefined &&
    registrationNumber !== null &&
    typeof registrationNumber !== 'string'
  ) {
    errors.push('registrationNumber must be a string or null.');
  }

  if (
    batchNumber !== undefined &&
    batchNumber !== null &&
    typeof batchNumber !== 'string'
  ) {
    errors.push('batchNumber must be a string or null.');
  }

  if (expiryDate !== undefined && expiryDate !== null) {
    if (
      typeof expiryDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)
    ) {
      errors.push('expiryDate must be a string in YYYY-MM-DD format, or null.');
    }
  }

  if (ingredients !== undefined && ingredients !== null) {
    if (
      !Array.isArray(ingredients) ||
      ingredients.some((i) => typeof i !== 'string')
    ) {
      errors.push('ingredients must be an array of strings, or null.');
    }
  }

  return { valid: errors.length === 0, errors };
}

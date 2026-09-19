export function validateLabelInput(body) {
  const errors = [];

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, errors: ['Request body must be a JSON object.'] };
  }

  const { productName, manufacturer, registrationNumber, expiryDate } = body;

  for (const [name, value] of Object.entries({
    productName,
    manufacturer,
    registrationNumber,
  })) {
    if (value !== undefined && value !== null && typeof value !== 'string') {
      errors.push(`${name} must be a string or null.`);
    }
  }

  for (const [name, value] of Object.entries({
    productName,
    manufacturer,
    registrationNumber,
  })) {
    if (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      errors.push(`${name} is required.`);
    }
  }

  if (expiryDate !== undefined && expiryDate !== null && expiryDate !== '') {
    if (
      typeof expiryDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)
    ) {
      errors.push('expiryDate must be a string in YYYY-MM-DD format, or null.');
    } else {
      const [year, month, day] = expiryDate.split('-').map(Number);
      const candidate = new Date(Date.UTC(year, month - 1, day));
      if (
        candidate.getUTCFullYear() !== year ||
        candidate.getUTCMonth() !== month - 1 ||
        candidate.getUTCDate() !== day
      ) {
        errors.push('expiryDate must be a real calendar date.');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

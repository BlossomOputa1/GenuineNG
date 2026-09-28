export function validateLabelInput(body) {
  const errors = [];
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, errors: ['Request body must be a JSON object.'] };
  }

  const fields = ['productName', 'manufacturer', 'registrationNumber'];
  for (const name of fields) {
    const value = body[name];
    if (value !== undefined && value !== null && typeof value !== 'string') errors.push(`${name} must be a string or null.`);
    if (typeof value === 'string' && value.length > 300) errors.push(`${name} is too long.`);
  }

  const expiryDate = body.expiryDate;
  if (expiryDate !== undefined && expiryDate !== null && expiryDate !== '') {
    if (typeof expiryDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      errors.push('expiryDate must be a string in YYYY-MM-DD format, or null.');
    } else {
      const [year, month, day] = expiryDate.split('-').map(Number);
      const candidate = new Date(Date.UTC(year, month - 1, day));
      if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) {
        errors.push('expiryDate must be a real calendar date.');
      }
    }
  }

  const hasAnyInput = fields.some((name) => typeof body[name] === 'string' && body[name].trim()) || Boolean(expiryDate);
  if (!hasAnyInput) errors.push('Provide at least one label detail to check.');
  return { valid: errors.length === 0, errors };
}

const LIMITS = {
  product_name: 300,
  manufacturer_text: 300,
  registration_number: 120,
  expiry_printed: 80,
};

export function validateScanInput(body) {
  const errors = [];
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { valid: false, errors: ['Request body must be a JSON object.'] };
  for (const [field, max] of Object.entries(LIMITS)) {
    const value = body[field];
    if (value != null && typeof value !== 'string') errors.push(`${field} must be a string or null.`);
    else if (typeof value === 'string' && value.length > max) errors.push(`${field} must be ${max} characters or fewer.`);
  }
  const normalized = body.expiry_normalized ?? body.expiry_date;
  if (normalized != null && normalized !== '' && (typeof normalized !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(normalized))) {
    errors.push('expiry_normalized must use YYYY-MM-DD format.');
  }
  if (body.checks !== undefined) {
    if (!Array.isArray(body.checks)) errors.push('checks must be an array.');
    else for (const check of body.checks) {
      const key = check.check_key ?? check.check_type;
      const status = check.status ?? check.outcome;
      if (!['registration', 'expiry'].includes(key)) errors.push(`Invalid check key: ${key}`);
      if (!['match', 'warning', 'not_checked', 'unverified'].includes(status)) errors.push(`Invalid check status: ${status}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

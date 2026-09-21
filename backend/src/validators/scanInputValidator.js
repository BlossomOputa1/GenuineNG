const LIMITS = {
  manufacturer_text: 500,
  registration_number: 100,
  batch_number: 100,
  ingredients_text: 10000,
};

export function validateScanInput(body) {
  const errors = [];

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, errors: ['Request body must be a JSON object.'] };
  }

  for (const [field, maxLength] of Object.entries(LIMITS)) {
    const value = body[field];
    if (value !== undefined && value !== null) {
      if (typeof value !== 'string') {
        errors.push(`${field} must be a string or null.`);
      } else if (value.length > maxLength) {
        errors.push(`${field} must be ${maxLength} characters or fewer.`);
      }
    }
  }

  if (body.expiry_date !== undefined && body.expiry_date !== null) {
    if (
      typeof body.expiry_date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.expiry_date)
    ) {
      errors.push(
        'expiry_date must be a string in YYYY-MM-DD format, or null.'
      );
    }
  }

  if (body.checks !== undefined) {
    if (!Array.isArray(body.checks)) {
      errors.push('checks must be an array.');
    } else {
      for (const check of body.checks) {
        if (!['registration', 'expiry'].includes(check.check_type)) {
          errors.push(`Invalid check_type: ${check.check_type}`);
        }
        if (
          !['match', 'warning', 'not_checked', 'unverified'].includes(
            check.outcome
          )
        ) {
          errors.push(`Invalid outcome: ${check.outcome}`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

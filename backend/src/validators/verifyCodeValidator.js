// Format validation only — this is public, unauthenticated input,
// so be strict about shape before any of it touches crypto or the DB.

export function validateVerifyCodeInput(body) {
  const errors = [];

  const payload = body?.payload;
  const signature =
    typeof body?.signature === 'string' ? body.signature.trim() : '';

  if (!payload || typeof payload !== 'object') {
    errors.push('payload is required and must be an object.');
  } else {
    const requiredPayloadFields = [
      'productId',
      'batchId',
      'unitId',
      'unitIndex',
      'keyVersion',
    ];
    for (const field of requiredPayloadFields) {
      if (payload[field] === undefined || payload[field] === null) {
        errors.push(`payload.${field} is required.`);
      }
    }
  }

  if (!signature) errors.push('signature is required.');

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], data: { payload, signature } };
}

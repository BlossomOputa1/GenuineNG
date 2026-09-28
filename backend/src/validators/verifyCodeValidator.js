// Strict shape validation for the public, unauthenticated verify-code endpoint.

export function validateVerifyCodeInput(body) {
  const errors = [];
  const payload = body?.payload;
  const signature = typeof body?.signature === 'string' ? body.signature.trim() : '';

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    errors.push('payload is required and must be an object.');
  } else {
    for (const field of ['productId', 'batchId', 'unitId', 'keyVersion']) {
      if (typeof payload[field] !== 'string' || !payload[field].trim()) {
        errors.push(`payload.${field} is required and must be a string.`);
      } else if (payload[field].length > 200) {
        errors.push(`payload.${field} is too long.`);
      }
    }
    if (!Number.isInteger(payload.unitIndex) || payload.unitIndex <= 0 || payload.unitIndex > 100000) {
      errors.push('payload.unitIndex must be a positive integer no greater than 100000.');
    }
  }

  if (!signature) errors.push('signature is required.');
  else if (signature.length > 1000) errors.push('signature is too long.');

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    errors: [],
    data: {
      payload: {
        productId: payload.productId.trim(),
        batchId: payload.batchId.trim(),
        unitId: payload.unitId.trim(),
        unitIndex: payload.unitIndex,
        keyVersion: payload.keyVersion.trim(),
      },
      signature,
    },
  };
}

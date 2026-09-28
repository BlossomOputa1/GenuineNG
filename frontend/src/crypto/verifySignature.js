export function canonicalPayload(payload = {}) {
  return {
    productId: payload.productId,
    batchId: payload.batchId,
    unitId: payload.unitId,
    unitIndex: payload.unitIndex,
    keyVersion: payload.keyVersion,
  };
}

export function parseSignedQr(rawValue) {
  let parsed;
  try {
    parsed = JSON.parse(String(rawValue || '').trim());
  } catch {
    throw new Error('This QR does not contain a readable GenuineNG code.');
  }

  const { payload, signature } = parsed || {};
  const required = ['productId', 'batchId', 'unitId', 'unitIndex', 'keyVersion'];
  if (
    !payload ||
    typeof payload !== 'object' ||
    !required.every((key) => payload[key] !== undefined && payload[key] !== null) ||
    typeof signature !== 'string' ||
    !signature.trim()
  ) {
    throw new Error('This QR is missing required GenuineNG signature data.');
  }

  return { payload: canonicalPayload(payload), signature: signature.trim() };
}

import { productReference } from './referenceData.js';

function normalize(value = '') {
  return String(value).trim().toUpperCase().replace(/\s+/g, ' ');
}

function normalizeLoose(value = '') {
  return normalize(value).replace(/[^A-Z0-9]/g, '');
}

function looselyMatches(supplied, reference) {
  const a = normalizeLoose(supplied);
  const b = normalizeLoose(reference);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function checkRegistration(registrationNumber, productName, manufacturer, now = new Date()) {
  if (!registrationNumber || registrationNumber.trim() === '') {
    return {
      status: 'not_checked',
      reason: 'No registration number was available to check.',
      checkedAt: now.toISOString(),
    };
  }

  const normalizedReg = normalizeLoose(registrationNumber);
  const record = productReference.products.find(
    item => normalizeLoose(item.registrationNumber) === normalizedReg
  );

  if (!record) {
    return {
      status: 'unverified',
      reason: 'No matching registration record was found in the current GenuineNG reference snapshot.',
      source: productReference.meta?.primarySource || 'Configured reference dataset',
      checkedAt: now.toISOString(),
      coverageNote: productReference.meta?.coverage || null,
    };
  }

  const productMismatch = !looselyMatches(productName, record.productName);
  const manufacturerMismatch = !looselyMatches(manufacturer, record.manufacturer);

  if (productMismatch || manufacturerMismatch) {
    const mismatchParts = [];
    if (productMismatch) mismatchParts.push('product name');
    if (manufacturerMismatch) mismatchParts.push('manufacturer');
    return {
      status: 'warning',
      reason: `The registration number is valid in the current reference snapshot, but the printed ${mismatchParts.join(' and ')} does not match the record for ${record.productName}.`,
      source: record.sourceUrl,
      checkedAt: now.toISOString(),
      matchedRecord: {
        productName: record.productName,
        manufacturer: record.manufacturer,
        registrationNumber: record.registrationNumber,
      },
    };
  }

  return {
    status: 'match',
    reason: `The registration number, product name and manufacturer match the reference record for ${record.productName}.`,
    source: record.sourceUrl,
    checkedAt: now.toISOString(),
    matchedRecord: {
      productName: record.productName,
      manufacturer: record.manufacturer,
      registrationNumber: record.registrationNumber,
    },
    coverageNote: productReference.meta?.coverage || null,
  };
}

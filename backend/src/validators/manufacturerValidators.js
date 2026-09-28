// Validation = format/required-field checks at the API boundary.
// This does NOT verify the product is real — that's not a Layer 2
// concept the same way it was for Layer 1 label checks; a manufacturer
// registering a product is asserting it exists, not being checked
// against an external source.

export function validateProductInput(body) {
  const errors = [];

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const category =
    typeof body?.category === 'string' ? body.category.trim() : '';
  const nafdacNumber =
    typeof body?.nafdacNumber === 'string' ? body.nafdacNumber.trim() : '';

  if (!name) errors.push('name is required.');
  else if (name.length > 200) errors.push('name cannot exceed 200 characters.');
  if (!category) errors.push('category is required.');
  else if (category.length > 80) errors.push('category cannot exceed 80 characters.');
  if (nafdacNumber.length > 120) errors.push('nafdacNumber cannot exceed 120 characters.');

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      name,
      category,
      // nafdac_number is legitimately optional — cosmetics aren't in
      // NAFDAC's Greenbook categories at all (see Layer 1 README).
      nafdacNumber: nafdacNumber || null,
    },
  };
}

export function validateBatchInput(body) {
  const errors = [];

  const productId =
    typeof body?.productId === 'string' ? body.productId.trim() : '';
  const batchCode =
    typeof body?.batchCode === 'string' ? body.batchCode.trim() : '';
  const manufacturedDate =
    typeof body?.manufacturedDate === 'string'
      ? body.manufacturedDate.trim()
      : '';
  const expiryDate =
    typeof body?.expiryDate === 'string' ? body.expiryDate.trim() : '';
  const unitsProduced = Number(body?.unitsProduced);

  if (!productId) errors.push('productId is required.');
  if (!batchCode) errors.push('batchCode is required.');
  else if (batchCode.length > 100) errors.push('batchCode cannot exceed 100 characters.');
  if (!manufacturedDate || Number.isNaN(Date.parse(manufacturedDate))) {
    errors.push('manufacturedDate must be a valid ISO 8601 date.');
  }
  if (!expiryDate || Number.isNaN(Date.parse(expiryDate))) {
    errors.push('expiryDate must be a valid ISO 8601 date.');
  }
  if (!Number.isInteger(unitsProduced) || unitsProduced <= 0) {
    errors.push('unitsProduced must be a positive integer.');
  } else if (unitsProduced > 100000) {
    errors.push('unitsProduced cannot exceed 100000 units per batch.');
  }

  if (manufacturedDate && expiryDate && !Number.isNaN(Date.parse(manufacturedDate)) && !Number.isNaN(Date.parse(expiryDate)) && Date.parse(expiryDate) <= Date.parse(manufacturedDate)) {
    errors.push('expiryDate must be later than manufacturedDate.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: { productId, batchCode, manufacturedDate, expiryDate, unitsProduced },
  };
}

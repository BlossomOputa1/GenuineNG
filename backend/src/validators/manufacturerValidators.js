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
  if (!category) errors.push('category is required.');

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

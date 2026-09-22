// Business logic only, independently testable.
// productId ownership is enforced two ways: RLS's insert policy is the
// real boundary (see migration below), but we also do an explicit
// pre-check here so a mismatched productId returns a clear 404/403
// instead of an opaque RLS-rejected-insert error.

export async function createBatch({
  supabase,
  manufacturerId,
  productId,
  batchCode,
  manufacturedDate,
  expiryDate,
  unitsProduced,
}) {
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('manufacturer_id', manufacturerId)
    .maybeSingle();

  if (productError) {
    const err = new Error('Failed to verify product ownership.');
    err.statusCode = 500;
    err.cause = productError;
    throw err;
  }

  if (!product) {
    const err = new Error('Product not found for this manufacturer.');
    err.statusCode = 404;
    err.code = 'PRODUCT_NOT_FOUND';
    throw err;
  }

  const { data, error } = await supabase
    .from('batches')
    .insert({
      product_id: productId,
      batch_code: batchCode,
      manufactured_date: manufacturedDate,
      expiry_date: expiryDate,
      units_produced: unitsProduced,
    })
    .select(
      'id, product_id, batch_code, manufactured_date, expiry_date, units_produced, created_at'
    )
    .single();

  if (error) {
    // Postgres unique_violation on batches_batch_code_key
    if (error.code === '23505') {
      const err = new Error('This batch code is already in use.');
      err.statusCode = 409;
      err.code = 'BATCH_CODE_TAKEN';
      throw err;
    }
    const err = new Error('Failed to create batch.');
    err.statusCode = 500;
    err.cause = error;
    throw err;
  }

  return data;
}

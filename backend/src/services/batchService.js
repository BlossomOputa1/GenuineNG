// Manufacturer batch operations. Writes stay RLS-scoped. Batch statistics are
// aggregated in Postgres so the API remains practical for tens of thousands of
// issued unit codes.

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
    if (error.code === '23505') {
      const err = new Error('This batch code is already in use for this product.');
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

export async function getBatchesForManufacturer({ supabase, manufacturerId }) {
  const { data, error } = await supabase.rpc('get_manufacturer_batch_stats', {
    p_manufacturer_id: manufacturerId,
  });

  if (error) {
    const err = new Error('Failed to load batches. Run the latest Supabase migrations if this persists.');
    err.statusCode = 500;
    err.cause = error;
    throw err;
  }

  return (data || []).map((row) => {
    const codesGenerated = Number(row.codes_generated || 0);
    const unitsProduced = Number(row.units_produced || 0);
    const status = codesGenerated >= unitsProduced
      ? 'generated'
      : codesGenerated > 0
        ? 'partial'
        : 'ready_to_generate';

    return {
      id: row.id,
      batchCode: row.batch_code,
      productId: row.product_id,
      productName: row.product_name,
      manufacturedDate: row.manufactured_date,
      expiryDate: row.expiry_date,
      unitsProduced,
      codesGenerated,
      createdAt: row.created_at,
      status,
    };
  });
}

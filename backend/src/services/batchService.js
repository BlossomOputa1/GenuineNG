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

// Read-only aggregate for the manufacturer's Overview/Batches pages
// and the Generate Codes batch-selection dropdown. Same RLS-scoped
// req.supabase pattern as createBatch above.
export async function getBatchesForManufacturer({ supabase, manufacturerId }) {
  const { data: batches, error: batchesError } = await supabase
    .from('batches')
    .select(
      'id, batch_code, manufactured_date, expiry_date, units_produced, created_at, product_id, products!inner(id, name, manufacturer_id)'
    )
    .eq('products.manufacturer_id', manufacturerId)
    .order('created_at', { ascending: false });

  if (batchesError) {
    const err = new Error('Failed to load batches.');
    err.statusCode = 500;
    err.cause = batchesError;
    throw err;
  }

  if (!batches || batches.length === 0) {
    return [];
  }

  const batchIds = batches.map((b) => b.id);

  const { data: units, error: unitsError } = await supabase
    .from('unit_codes')
    .select('unit_id, batch_id')
    .in('batch_id', batchIds);

  if (unitsError) {
    const err = new Error('Failed to load unit codes for batch stats.');
    err.statusCode = 500;
    err.cause = unitsError;
    throw err;
  }

  const codesGeneratedByBatch = new Map();
  for (const unit of units || []) {
    codesGeneratedByBatch.set(
      unit.batch_id,
      (codesGeneratedByBatch.get(unit.batch_id) || 0) + 1
    );
  }

  return batches.map((b) => {
    const codesGenerated = codesGeneratedByBatch.get(b.id) || 0;
    return {
      id: b.id,
      batchCode: b.batch_code,
      productId: b.product_id,
      productName: b.products.name,
      manufacturedDate: b.manufactured_date,
      expiryDate: b.expiry_date,
      unitsProduced: b.units_produced,
      codesGenerated,
      // Deliberately just two states for now, matching "deliberately
      // simple" elsewhere — a partial-generation state can't currently
      // happen anyway, since generate-codes is all-or-nothing per batch
      // (fails loud and stops on first chunk error, no partial retry path).
      status:
        codesGenerated >= b.units_produced ? 'generated' : 'ready_to_generate',
    };
  });
}

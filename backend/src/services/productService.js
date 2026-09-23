// Business logic only — no req/res, independently testable.
// Uses the caller's RLS-scoped Supabase client (req.supabase from
// authMiddleware.js), not a service-role client, so the insert RLS
// policy is the real authorization boundary here, not app code.

export async function createProduct({
  supabase,
  manufacturerId,
  name,
  category,
  nafdacNumber,
}) {
  const { data, error } = await supabase
    .from('products')
    .insert({
      manufacturer_id: manufacturerId,
      name,
      category,
      nafdac_number: nafdacNumber,
    })
    .select('id, manufacturer_id, name, category, nafdac_number, created_at')
    .single();

  if (error) {
    const err = new Error('Failed to register product.');
    err.statusCode = 500;
    err.cause = error;
    throw err;
  }

  return data;
}

// Read-only aggregate for the manufacturer's Overview/Products pages.
// Same RLS-scoped req.supabase pattern as createProduct above.
// Deliberately queries products/batches/unit_codes/verification_events
// separately and aggregates in JS, same philosophy as
// scanActivityService.js — small, auditable queries over one clever
// SQL aggregate, given hackathon-scale data volume.
export async function getProductsForManufacturer({ supabase, manufacturerId }) {
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, category, nafdac_number, created_at')
    .eq('manufacturer_id', manufacturerId)
    .order('created_at', { ascending: false });

  if (productsError) {
    const err = new Error('Failed to load products.');
    err.statusCode = 500;
    err.cause = productsError;
    throw err;
  }

  if (!products || products.length === 0) {
    return [];
  }

  const productIds = products.map((p) => p.id);

  const { data: batches, error: batchesError } = await supabase
    .from('batches')
    .select('id, product_id')
    .in('product_id', productIds);

  if (batchesError) {
    const err = new Error('Failed to load batches for product stats.');
    err.statusCode = 500;
    err.cause = batchesError;
    throw err;
  }

  const batchIds = (batches || []).map((b) => b.id);
  const batchToProductId = new Map(
    (batches || []).map((b) => [b.id, b.product_id])
  );

  let units = [];
  if (batchIds.length > 0) {
    const { data: unitsData, error: unitsError } = await supabase
      .from('unit_codes')
      .select('unit_id, batch_id')
      .in('batch_id', batchIds);

    if (unitsError) {
      const err = new Error('Failed to load unit codes for product stats.');
      err.statusCode = 500;
      err.cause = unitsError;
      throw err;
    }
    units = unitsData || [];
  }

  const unitIds = units.map((u) => u.unit_id);
  const unitToProductId = new Map(
    units.map((u) => [u.unit_id, batchToProductId.get(u.batch_id)])
  );

  let events = [];
  if (unitIds.length > 0) {
    const { data: eventsData, error: eventsError } = await supabase
      .from('verification_events')
      .select('unit_id')
      .in('unit_id', unitIds);

    if (eventsError) {
      const err = new Error('Failed to load scans for product stats.');
      err.statusCode = 500;
      err.cause = eventsError;
      throw err;
    }
    events = eventsData || [];
  }

  const batchCountByProduct = new Map();
  for (const batch of batches || []) {
    batchCountByProduct.set(
      batch.product_id,
      (batchCountByProduct.get(batch.product_id) || 0) + 1
    );
  }

  const codesIssuedByProduct = new Map();
  for (const unit of units) {
    const productId = batchToProductId.get(unit.batch_id);
    codesIssuedByProduct.set(
      productId,
      (codesIssuedByProduct.get(productId) || 0) + 1
    );
  }

  const scansByProduct = new Map();
  for (const event of events) {
    const productId = unitToProductId.get(event.unit_id);
    if (!productId) continue;
    scansByProduct.set(productId, (scansByProduct.get(productId) || 0) + 1);
  }

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    nafdacNumber: p.nafdac_number,
    createdAt: p.created_at,
    batchCount: batchCountByProduct.get(p.id) || 0,
    codesIssued: codesIssuedByProduct.get(p.id) || 0,
    scans: scansByProduct.get(p.id) || 0,
  }));
}

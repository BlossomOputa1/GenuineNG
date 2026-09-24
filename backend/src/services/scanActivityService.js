// Aggregates scan activity across a manufacturer's units. Uses the
// caller's RLS-scoped req.supabase (not service-role) — this is a
// read of the manufacturer's own data, same pattern as
// productService.js/batchService.js, unlike codeGenerationService.js
// or verify-code which deliberately bypass RLS.
//
// Aggregation happens in JS rather than a SQL GROUP BY, since
// supabase-js doesn't expose grouped aggregates directly and data
// volume here is small enough (hackathon scale) that this is the
// simpler, more auditable choice over writing a Postgres function.

export async function getScanActivity({ supabase, manufacturerId }) {
  const { data: batches, error: batchesError } = await supabase
    .from('batches')
    .select(
      'id, batch_code, product_id, products!inner(id, name, manufacturer_id)'
    )
    .eq('products.manufacturer_id', manufacturerId);

  if (batchesError) {
    const err = new Error('Failed to load batches for scan activity.');
    err.statusCode = 500;
    err.cause = batchesError;
    throw err;
  }

  if (!batches || batches.length === 0) {
    return { totalUnitsGenerated: 0, totalScans: 0, batches: [] };
  }

  const batchIds = batches.map((b) => b.id);
  const batchInfoById = new Map(
    batches.map((b) => [
      b.id,
      { batchCode: b.batch_code, productName: b.products.name },
    ])
  );

  const { data: units, error: unitsError } = await supabase
    .from('unit_codes')
    .select('unit_id, batch_id')
    .in('batch_id', batchIds);

  if (unitsError) {
    const err = new Error('Failed to load unit codes for scan activity.');
    err.statusCode = 500;
    err.cause = unitsError;
    throw err;
  }

  if (!units || units.length === 0) {
    return { totalUnitsGenerated: 0, totalScans: 0, batches: [] };
  }

  const unitToBatchId = new Map(units.map((u) => [u.unit_id, u.batch_id]));
  const unitIds = units.map((u) => u.unit_id);

  const { data: events, error: eventsError } = await supabase
    .from('verification_events')
    .select('unit_id, result, reuse_status')
    .in('unit_id', unitIds);

  if (eventsError) {
    const err = new Error(
      'Failed to load verification events for scan activity.'
    );
    err.statusCode = 500;
    err.cause = eventsError;
    throw err;
  }

  const perBatch = new Map();
  for (const batchId of batchIds) {
    const info = batchInfoById.get(batchId);
    perBatch.set(batchId, {
      batchId,
      batchCode: info.batchCode,
      productName: info.productName,
      unitsGenerated: 0,
      totalScans: 0,
      genuineScans: 0,
      notGenuineScans: 0,
      reuseSignals: 0,
    });
  }

  for (const unit of units) {
    perBatch.get(unit.batch_id).unitsGenerated += 1;
  }

  for (const event of events || []) {
    const batchId = unitToBatchId.get(event.unit_id);
    if (!batchId) continue; // defensive — shouldn't happen given the query above
    const entry = perBatch.get(batchId);
    entry.totalScans += 1;
    if (event.result === 'genuine') {
      entry.genuineScans += 1;
    } else {
      entry.notGenuineScans += 1;
    }
    // Old rows from before the reuse_status column existed will have
    // it as null — those simply don't count toward reuseSignals,
    // which is correct: we genuinely don't know their reuse status.
    if (event.reuse_status === 'possible_reuse') {
      entry.reuseSignals += 1;
    }
  }

  return {
    totalUnitsGenerated: units.length,
    totalScans: (events || []).length,
    batches: Array.from(perBatch.values()),
  };
}

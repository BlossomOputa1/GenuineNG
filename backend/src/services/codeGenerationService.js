// Business logic only. Deliberately imports the service-role Supabase
// client directly (bypasses RLS by design — see LAYER2_PROGRESS.md
// "Why unit_codes has no insert policy"), rather than taking the
// caller's RLS-scoped req.supabase like every other manufacturer
// service. Authorization already happened in manufacturerAuthMiddleware
// before this runs; the explicit ownership check below is the real
// authorization boundary for this operation, since RLS isn't backing
// it up here.

import { supabase } from '../config/supabaseClient.js';
import { signUnit } from './signer.js';

const CHUNK_SIZE = 500;

export async function generateCodesForBatch({ manufacturerId, batchId }) {
  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .select(
      'id, batch_code, units_produced, product_id, products!inner(manufacturer_id)'
    )
    .eq('id', batchId)
    .single();

  if (batchError || !batch) {
    const err = new Error('Batch not found.');
    err.statusCode = 404;
    err.code = 'BATCH_NOT_FOUND';
    throw err;
  }

  if (batch.products.manufacturer_id !== manufacturerId) {
    // Same response as "not found" — don't reveal that a batch with
    // this id exists but belongs to someone else.
    const err = new Error('Batch not found.');
    err.statusCode = 404;
    err.code = 'BATCH_NOT_FOUND';
    throw err;
  }

  const { count, error: countError } = await supabase
    .from('unit_codes')
    .select('id', { count: 'exact', head: true })
    .eq('batch_id', batchId);

  if (countError) {
    const err = new Error('Failed to check existing codes for this batch.');
    err.statusCode = 500;
    err.cause = countError;
    throw err;
  }

  if (count > 0) {
    const err = new Error('Codes have already been generated for this batch.');
    err.statusCode = 409;
    err.code = 'CODES_ALREADY_GENERATED';
    throw err;
  }

  const rows = [];
  for (let unitIndex = 1; unitIndex <= batch.units_produced; unitIndex += 1) {
    const signed = signUnit({
      productId: batch.product_id,
      batchId: batch.id,
      batchCode: batch.batch_code,
      unitIndex,
    });

    rows.push({
      batch_id: batch.id,
      unit_index: unitIndex,
      unit_id: signed.unitId,
      payload: signed.payload,
      signature: signed.signature,
      key_version: signed.keyVersion,
    });
  }

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error: insertError } = await supabase
      .from('unit_codes')
      .insert(chunk);

    if (insertError) {
      const err = new Error(
        `Failed while inserting unit codes (${i} of ${rows.length} inserted before failure).`
      );
      err.statusCode = 500;
      err.code = 'CODE_INSERT_FAILED';
      err.cause = insertError;
      throw err;
    }
  }

  return {
    batchId: batch.id,
    batchCode: batch.batch_code,
    unitsGenerated: rows.length,
  };
}

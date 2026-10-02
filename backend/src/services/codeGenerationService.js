import { supabase } from '../config/supabaseClient.js';
import { signUnit } from './signer.js';

export const MAX_UNITS_PER_BATCH = 100_000;
export const GENERATION_CHUNK_SIZE = 1_000;

async function loadOwnedBatch(manufacturerId, batchId) {
  const { data: batch, error } = await supabase
    .from('batches')
    .select('id, batch_code, units_produced, product_id, products!inner(manufacturer_id)')
    .eq('id', batchId)
    .maybeSingle();
  if (error) throw error;
  if (!batch || batch.products?.manufacturer_id !== manufacturerId) {
    const err = new Error('Batch not found.');
    err.statusCode = 404;
    err.code = 'BATCH_NOT_FOUND';
    throw err;
  }
  return batch;
}

async function countCodes(batchId) {
  const { count, error } = await supabase
    .from('unit_codes')
    .select('id', { count: 'exact', head: true })
    .eq('batch_id', batchId);
  if (error) throw error;
  return Number(count || 0);
}

export async function getGenerationStatus({ manufacturerId, batchId }) {
  const batch = await loadOwnedBatch(manufacturerId, batchId);
  const generated = await countCodes(batchId);
  return {
    batchId,
    batchCode: batch.batch_code,
    generated,
    total: batch.units_produced,
    percent: batch.units_produced ? Math.floor((generated / batch.units_produced) * 100) : 0,
    complete: generated >= batch.units_produced,
    exportReady: generated >= batch.units_produced,
  };
}

export async function generateNextCodeChunk({ manufacturerId, batchId, chunkSize = GENERATION_CHUNK_SIZE }) {
  const batch = await loadOwnedBatch(manufacturerId, batchId);
  if (batch.units_produced > MAX_UNITS_PER_BATCH) {
    const err = new Error(`This batch exceeds the ${MAX_UNITS_PER_BATCH.toLocaleString('en-US')} unit generation limit.`);
    err.statusCode = 400;
    err.code = 'BATCH_TOO_LARGE';
    throw err;
  }

  const beforeCount = await countCodes(batchId);
  if (beforeCount >= batch.units_produced) {
    return { ...(await getGenerationStatus({ manufacturerId, batchId })), newlyGenerated: 0, resumed: beforeCount > 0 };
  }

  const safeChunk = Math.min(Math.max(Number(chunkSize) || GENERATION_CHUNK_SIZE, 1), GENERATION_CHUNK_SIZE);
  const start = beforeCount + 1;
  const end = Math.min(batch.units_produced, beforeCount + safeChunk);
  const rows = [];
  for (let unitIndex = start; unitIndex <= end; unitIndex += 1) {
    const signed = signUnit({
      productId: batch.product_id,
      batchId: batch.id,
      unitIndex,
    });
    rows.push({
      batch_id: batch.id,
      unit_index: unitIndex,
      unit_id: signed.unitId,
      payload: signed.payload,
      signature: signed.signature,
      key_version: signed.keyVersion,
      status: 'active',
    });
  }

  const { error: insertError } = await supabase
    .from('unit_codes')
    .upsert(rows, { onConflict: 'batch_id,unit_index', ignoreDuplicates: true });
  if (insertError) {
    const err = new Error(`Code generation paused near unit ${start}. Retry to continue safely.`);
    err.statusCode = 500;
    err.code = 'CODE_INSERT_FAILED';
    err.cause = insertError;
    throw err;
  }

  const afterCount = await countCodes(batchId);
  return {
    batchId: batch.id,
    batchCode: batch.batch_code,
    generated: afterCount,
    total: batch.units_produced,
    percent: Math.floor((afterCount / batch.units_produced) * 100),
    complete: afterCount >= batch.units_produced,
    exportReady: afterCount >= batch.units_produced,
    newlyGenerated: Math.max(0, afterCount - beforeCount),
    resumed: beforeCount > 0,
  };
}

// Backward-compatible helper used by older tests/imports. It intentionally
// generates one bounded chunk per call so the browser can show real progress.
export const generateCodesForBatch = generateNextCodeChunk;

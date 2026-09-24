// Builds exportable batch data in one of three formats: a CSV of
// unit_id/unit_index, a print manifest (bare unit_id list), or a ZIP
// of QR PNGs. Split into three functions rather than always bundling
// everything, so a CSV-only request doesn't pay the cost of
// generating hundreds of QR images it'll never use.
//
// Uses the caller's RLS-scoped req.supabase — this only reads
// unit_codes the manufacturer already owns (backed by the existing
// select policy), no bypass needed here.

import { createRequire } from 'node:module';
import { generateQrPng } from './qrGenerator.js';

// Installed archiver version exports ZipArchive as a class, not the
// older archiver('zip', opts) factory most docs assume — see
// LAYER2_PROGRESS.md.
const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');

async function loadOwnedBatchWithUnits({ supabase, manufacturerId, batchId }) {
  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .select('id, batch_code, product_id, products!inner(manufacturer_id)')
    .eq('id', batchId)
    .single();

  if (batchError || !batch) {
    const err = new Error('Batch not found.');
    err.statusCode = 404;
    err.code = 'BATCH_NOT_FOUND';
    throw err;
  }

  if (batch.products.manufacturer_id !== manufacturerId) {
    const err = new Error('Batch not found.');
    err.statusCode = 404;
    err.code = 'BATCH_NOT_FOUND';
    throw err;
  }

  const { data: units, error: unitsError } = await supabase
    .from('unit_codes')
    .select('unit_id, unit_index, payload, signature')
    .eq('batch_id', batchId)
    .order('unit_index', { ascending: true });

  if (unitsError) {
    const err = new Error('Failed to load unit codes for export.');
    err.statusCode = 500;
    err.cause = unitsError;
    throw err;
  }

  if (!units || units.length === 0) {
    const err = new Error('No codes have been generated for this batch yet.');
    err.statusCode = 404;
    err.code = 'NO_CODES_GENERATED';
    throw err;
  }

  return { batch, units };
}

export async function sendCsvExport({
  supabase,
  manufacturerId,
  batchId,
  res,
}) {
  const { batch, units } = await loadOwnedBatchWithUnits({
    supabase,
    manufacturerId,
    batchId,
  });

  const header = 'unit_id,unit_index,qr_filename\n';
  const rows = units
    .map((u) => `${u.unit_id},${u.unit_index},${u.unit_id}.png`)
    .join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${batch.batch_code}-codes.csv"`
  );
  res.send(header + rows);
}

export async function sendManifestExport({
  supabase,
  manufacturerId,
  batchId,
  res,
}) {
  const { batch, units } = await loadOwnedBatchWithUnits({
    supabase,
    manufacturerId,
    batchId,
  });

  const header = 'unit_id\n';
  const rows = units.map((u) => u.unit_id).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${batch.batch_code}-print-manifest.csv"`
  );
  res.send(header + rows);
}

export async function streamQrZipExport({
  supabase,
  manufacturerId,
  batchId,
  res,
}) {
  const { batch, units } = await loadOwnedBatchWithUnits({
    supabase,
    manufacturerId,
    batchId,
  });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${batch.batch_code}-qr-codes.zip"`
  );

  // PNGs are already compressed image data — deflating them again at
  // max effort (level 9) burns CPU time for negligible size savings.
  // Level 0 = store only (no compression attempt), which is the
  // correct choice for a ZIP full of already-compressed files.
  const archive = new ZipArchive({ zlib: { level: 0 } });
  archive.pipe(res);

  for (const unit of units) {
    const png = await generateQrPng({
      payload: unit.payload,
      signature: unit.signature,
    });
    archive.append(png, { name: `${unit.unit_id}.png` });
  }

  await archive.finalize();
}

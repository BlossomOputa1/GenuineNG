// Builds a ZIP containing a CSV, individual QR PNGs, and a print
// manifest for every unit in a batch. Uses the caller's RLS-scoped
// req.supabase — this only reads unit_codes the manufacturer already
// owns (backed by the existing select policy), no bypass needed here.

import { createRequire } from 'node:module';
import { generateQrPng } from './qrGenerator.js';

// The installed archiver version exports ZipArchive as a class
// (new archiver API), not the older archiver('zip', opts) factory
// function most tutorials assume.
const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');

export async function buildBatchExportStream({
  supabase,
  manufacturerId,
  batchId,
  res,
}) {
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

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${batch.batch_code}-export.zip"`
  );

  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.pipe(res);

  const csvHeader = 'unit_id,unit_index,qr_filename\n';
  const csvRows = units
    .map((u) => `${u.unit_id},${u.unit_index},${u.unit_id}.png`)
    .join('\n');
  archive.append(csvHeader + csvRows, {
    name: `${batch.batch_code}-codes.csv`,
  });

  const manifestHeader = 'unit_id\n';
  const manifestRows = units.map((u) => u.unit_id).join('\n');
  archive.append(manifestHeader + manifestRows, {
    name: `${batch.batch_code}-print-manifest.csv`,
  });

  for (const unit of units) {
    const png = await generateQrPng({
      payload: unit.payload,
      signature: unit.signature,
    });
    archive.append(png, { name: `qr/${unit.unit_id}.png` });
  }

  await archive.finalize();
}

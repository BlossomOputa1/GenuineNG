import { validateProductInput, validateBatchInput } from '../validators/manufacturerValidators.js';
import { createProduct, updateProduct, getProductsForManufacturer } from '../services/productService.js';
import { createBatch, getBatchesForManufacturer } from '../services/batchService.js';
import { generateNextCodeChunk, getGenerationStatus } from '../services/codeGenerationService.js';
import { getScanActivity } from '../services/scanActivityService.js';
import { sendCsvExport, sendManifestExport, streamQrZipExport } from '../services/exportService.js';

function handleKnownError(err, res, next) {
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: { code: err.code || 'ERROR', message: err.message } });
  }
  return next(err);
}

export async function registerProduct(req, res, next) {
  try {
    const { valid, errors, data } = validateProductInput(req.body);
    if (!valid) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Invalid product data.', details: errors } });
    const product = await createProduct({ supabase: req.supabase, manufacturerId: req.manufacturer.id, ...data });
    return res.status(201).json({ product });
  } catch (err) { return handleKnownError(err, res, next); }
}

export async function updateProductController(req, res, next) {
  try {
    const { valid, errors, data } = validateProductInput(req.body);
    if (!valid) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Invalid product data.', details: errors } });
    const product = await updateProduct({
      supabase: req.supabase,
      manufacturerId: req.manufacturer.id,
      productId: req.params.id,
      ...data,
    });
    return res.status(200).json({ product });
  } catch (err) { return handleKnownError(err, res, next); }
}

export async function listProductsController(req, res, next) {
  try {
    const products = await getProductsForManufacturer({ supabase: req.supabase, manufacturerId: req.manufacturer.id });
    return res.status(200).json({ products });
  } catch (err) { return handleKnownError(err, res, next); }
}

export async function createBatchController(req, res, next) {
  try {
    const { valid, errors, data } = validateBatchInput(req.body);
    if (!valid) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Invalid batch data.', details: errors } });
    const batch = await createBatch({ supabase: req.supabase, manufacturerId: req.manufacturer.id, ...data });
    return res.status(201).json({ batch });
  } catch (err) { return handleKnownError(err, res, next); }
}

export async function listBatchesController(req, res, next) {
  try {
    const batches = await getBatchesForManufacturer({ supabase: req.supabase, manufacturerId: req.manufacturer.id });
    return res.status(200).json({ batches });
  } catch (err) { return handleKnownError(err, res, next); }
}

export async function generationStatusController(req, res, next) {
  try {
    const status = await getGenerationStatus({ manufacturerId: req.manufacturer.id, batchId: req.params.id });
    return res.status(200).json({ status });
  } catch (err) { return handleKnownError(err, res, next); }
}

export async function generateCodesController(req, res, next) {
  try {
    if (!req.params.id) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Batch id is required in the URL.' } });
    const result = await generateNextCodeChunk({
      manufacturerId: req.manufacturer.id,
      batchId: req.params.id,
      chunkSize: req.body?.chunkSize,
    });
    return res.status(result.complete ? 200 : 202).json({ result });
  } catch (err) { return handleKnownError(err, res, next); }
}

export async function scanActivityController(req, res, next) {
  try {
    const activity = await getScanActivity({ supabase: req.supabase, manufacturerId: req.manufacturer.id });
    return res.status(200).json({ activity });
  } catch (err) { return handleKnownError(err, res, next); }
}

const VALID_EXPORT_FORMATS = ['csv', 'manifest', 'qr-zip'];
export async function exportBatchController(req, res, next) {
  try {
    const { id: batchId } = req.params;
    const { format } = req.query;
    if (!batchId || !VALID_EXPORT_FORMATS.includes(format)) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: `format must be one of: ${VALID_EXPORT_FORMATS.join(', ')}.` } });
    }
    const shared = { supabase: req.supabase, manufacturerId: req.manufacturer.id, batchId, res };
    if (format === 'csv') await sendCsvExport(shared);
    else if (format === 'manifest') await sendManifestExport(shared);
    else await streamQrZipExport(shared);
  } catch (err) {
    if (res.headersSent) { console.error('Export failed after streaming started:', err); return res.end(); }
    return handleKnownError(err, res, next);
  }
}

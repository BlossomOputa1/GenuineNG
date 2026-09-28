import { supabase } from './supabase.js';
import { getApiErrorMessage } from './errorShape.js';

const configuredBase = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL)?.trim();
const API_BASE_URL = configuredBase || (import.meta.env.DEV ? 'http://localhost:4000' : 'https://genuineng.onrender.com');
const CACHE_TTL_MS = 30_000;
const readCache = new Map();
let authContextPromise = null;

export class ApiError extends Error {
  constructor(message, status, code, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function readJson(response) {
  return response.json().catch(() => null);
}

function toErrorMessage(response, body) {
  return getApiErrorMessage(body) || `Request failed (${response.status}).`;
}

async function getAuthContext() {
  if (!authContextPromise) {
    authContextPromise = supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data?.session?.access_token || !data?.session?.user?.id) {
        throw new ApiError('You need to be signed in to do that.', 401, 'UNAUTHENTICATED');
      }
      return { userId: data.session.user.id, headers: { Authorization: `Bearer ${data.session.access_token}` } };
    }).finally(() => { authContextPromise = null; });
  }
  return authContextPromise;
}

async function cachedRead(resource, loader) {
  const auth = await getAuthContext();
  const key = `${auth.userId}:${resource}`;
  const cached = readCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = await loader(auth);
  readCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export function clearManufacturerCache() { readCache.clear(); }
function invalidateReads() { readCache.clear(); }

async function authenticatedFetch(path, options = {}) {
  const { headers } = await getAuthContext();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  
  const body = options.expectBlob ? null : await readJson(response);
  if (!response.ok) {
    const errorBody = body || await readJson(response);
    const code = errorBody?.error?.code || 'REQUEST_FAILED';
    const message = toErrorMessage(response, errorBody);
    throw new ApiError(message, response.status, code, errorBody?.error);
  }
  return { response, body };
}

export function getProducts(signal) {
  return cachedRead('products', async ({ headers }) => {
    const response = await fetch(`${API_BASE_URL}/api/manufacturer/products`, { headers, signal });
    const body = await readJson(response);
    if (!response.ok) throw new ApiError(toErrorMessage(response, body), response.status, body?.error?.code);
    return body.products;
  });
}

export function getBatches(signal) {
  return cachedRead('batches', async ({ headers }) => {
    const response = await fetch(`${API_BASE_URL}/api/manufacturer/batches`, { headers, signal });
    const body = await readJson(response);
    if (!response.ok) throw new ApiError(toErrorMessage(response, body), response.status, body?.error?.code);
    return body.batches;
  });
}

export function getScanActivity(signal) {
  return cachedRead('scan-activity', async ({ headers }) => {
    const response = await fetch(`${API_BASE_URL}/api/manufacturer/scan-activity`, { headers, signal });
    const body = await readJson(response);
    if (!response.ok) throw new ApiError(toErrorMessage(response, body), response.status, body?.error?.code);
    return body.activity;
  });
}

export async function registerProduct(payload, signal) {
  const { body } = await authenticatedFetch('/api/manufacturer/products', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal,
  });
  invalidateReads();
  return body.product;
}

export async function updateProduct(productId, payload, signal) {
  const { body } = await authenticatedFetch(`/api/manufacturer/products/${encodeURIComponent(productId)}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal,
  });
  invalidateReads();
  return body.product;
}

export async function createBatch(payload, signal) {
  const { body } = await authenticatedFetch('/api/manufacturer/batches', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal,
  });
  invalidateReads();
  return body.batch;
}

export async function getGenerationStatus(batchId, signal) {
  const { body } = await authenticatedFetch(`/api/manufacturer/batches/${encodeURIComponent(batchId)}/generation-status`, { signal });
  return body.status;
}

export async function generateCodes(batchId, onProgress, signal) {
  let status = await getGenerationStatus(batchId, signal);
  onProgress?.(status);
  while (!status.complete) {
    const { body } = await authenticatedFetch(`/api/manufacturer/batches/${encodeURIComponent(batchId)}/generate-codes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunkSize: 1000 }),
      signal,
    });
    status = body.result;
    onProgress?.(status);
  }
  invalidateReads();
  return status;
}

export async function downloadBatchExport(batchId, format) {
  const { headers } = await getAuthContext();
  const response = await fetch(`${API_BASE_URL}/api/manufacturer/batches/${encodeURIComponent(batchId)}/export?format=${encodeURIComponent(format)}`, { headers });
  if (!response.ok) {
    const body = await readJson(response);
    throw new ApiError(toErrorMessage(response, body), response.status, body?.error?.code);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match ? match[1] : `genuineng-${format}`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Request dynamic Nigerian Virtual Bank Account from BMoni Layer 2
export async function requestBatchVba(batchId, amount, signal) {
  const { body } = await authenticatedFetch('/api/manufacturer/vba', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batchId, amount }),
    signal,
  });
  return body.data || body;
}
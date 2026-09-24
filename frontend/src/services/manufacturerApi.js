import { supabase } from './supabase.js';
import { getApiErrorMessage } from './errorShape.js';

const configuredBase = (
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL
)?.trim();
const API_BASE_URL =
  configuredBase ||
  (import.meta.env.DEV
    ? 'http://localhost:4000'
    : 'https://genuineng.onrender.com');

  const CACHE_TTL_MS = 30_000;
  const readCache = new Map();
  let authHeadersPromise = null;

async function readJson(response) {
  return response.json().catch(() => null);
}

function toErrorMessage(response, body) {
  return getApiErrorMessage(body) || `Request failed (${response.status}).`;
}

// Every manufacturer route requires a bearer token. Pulls the current
// session fresh on each call rather than caching it, since
// autoRefreshToken means the token can rotate underneath a long-lived
// page — always reading it right before the request avoids sending
// a stale token.
async function getAuthHeaders() {
  if (!authHeadersPromise) {
    authHeadersPromise = supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data?.session?.access_token) {
        throw new Error('You need to be signed in to do that.');
      }
      return { Authorization: `Bearer ${data.session.access_token}` };
    }).finally(() => { authHeadersPromise = null; });
  }
  return authHeadersPromise;
}

async function cachedRead(key, loader) {
  const cached = readCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = await loader();
  readCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

function invalidateReads() {
  readCache.clear();
}

export function getProducts(signal) {
  return cachedRead('products', async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/manufacturer/products`, { headers, signal });
    const body = await readJson(response);
    if (!response.ok) throw new Error(toErrorMessage(response, body));
    return body.products;
  });
}

export function getBatches(signal) {
  return cachedRead('batches', async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/manufacturer/batches`, { headers, signal });
    const body = await readJson(response);
    if (!response.ok) throw new Error(toErrorMessage(response, body));
    return body.batches;
  });
}

export function getScanActivity(signal) {
  return cachedRead('scan-activity', async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/manufacturer/scan-activity`, { headers, signal });
    const body = await readJson(response);
    if (!response.ok) throw new Error(toErrorMessage(response, body));
    return body.activity;
  });
}

export async function registerProduct(
  { name, category, nafdacNumber },
  signal
) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/manufacturer/products`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, category, nafdacNumber }),
    signal,
  });

  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(toErrorMessage(response, body));
  }

  invalidateReads();
  return body.product;
}

export async function createBatch(
  { productId, batchCode, manufacturedDate, expiryDate, unitsProduced },
  signal
) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/manufacturer/batches`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId,
      batchCode,
      manufacturedDate,
      expiryDate,
      unitsProduced,
    }),
    signal,
  });

  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(toErrorMessage(response, body));
  }

  invalidateReads();
  return body.batch;
}

export async function generateCodes(batchId, signal) {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/manufacturer/batches/${batchId}/generate-codes`,
    { method: 'POST', headers, signal }
  );

  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(toErrorMessage(response, body));
  }

  invalidateReads();
  return body.result;
}

// Export routes return a raw file (CSV text or a ZIP), not JSON, so
// this triggers a browser download directly rather than returning
// parsed data like the functions above.
export async function downloadBatchExport(batchId, format) {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/manufacturer/batches/${batchId}/export?format=${format}`,
    { headers }
  );

  if (!response.ok) {
    const body = await readJson(response);
    throw new Error(toErrorMessage(response, body));
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match ? match[1] : `export-${format}`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

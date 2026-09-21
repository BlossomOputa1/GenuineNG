import { buildVerificationPayload } from './labelPayload.js';
import { getApiErrorMessage } from './errorShape.js';

const configuredBase = (
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL
)?.trim();
const API_BASE_URL = configuredBase || (import.meta.env.DEV ? 'http://localhost:4000' : 'https://genuineng.onrender.com');

export function getApiBaseUrl() {
  return API_BASE_URL;
}

async function readJson(response) {
  return response.json().catch(() => null);
}

function toErrorMessage(response, body) {
  const message = getApiErrorMessage(body) || `Request failed (${response.status}).`;
  return message;
}

export async function extractLabelFields(frontBlob, backBlob, signal) {
  if (!frontBlob || !backBlob) throw new Error('Front and back images are both required.');

  const form = new FormData();
  form.append('front', frontBlob, 'front.webp');
  form.append('back', backBlob, 'back.webp');

  const response = await fetch(`${API_BASE_URL}/api/extract-label`, {
    method: 'POST',
    body: form,
    signal,
  });

  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(toErrorMessage(response, body));
  }

  return body || {
    status: 'extraction_unavailable',
    fields: { productName: null, manufacturer: null, registrationNumber: null, expiryDate: null },
  };
}

export async function runLabelVerification(fields, signal) {
  const { payload, normalization } = buildVerificationPayload(fields);
  const response = await fetch(`${API_BASE_URL}/api/label-checks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(toErrorMessage(response, body));
  }

  return { ...body, normalization, submitted: payload };
}

export async function checkBackendHealth(signal) {
  const response = await fetch(`${API_BASE_URL}/api/health`, { signal });
  if (!response.ok) throw new Error('Backend health check failed.');
  return response.json();
}

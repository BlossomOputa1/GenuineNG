import { buildVerificationPayload } from './labelPayload';

const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE_URL = configuredBase || (import.meta.env.DEV ? 'http://localhost:4000' : '');

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export async function runLabelVerification(fields, signal) {
  const { payload, normalization } = buildVerificationPayload(fields);
  const response = await fetch(`${API_BASE_URL}/api/label-checks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.details?.join(' ') || body?.reason || `Verification request failed (${response.status}).`;
    throw new Error(detail);
  }

  return { ...body, normalization, submitted: payload };
}

export async function checkBackendHealth(signal) {
  const response = await fetch(`${API_BASE_URL}/api/health`, { signal });
  if (!response.ok) throw new Error('Backend health check failed.');
  return response.json();
}

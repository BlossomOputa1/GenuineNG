import { buildVerificationPayload } from './labelPayload';

const RENDER_FALLBACK = 'https://genuine-ng.onrender.com'; // ← replace with your actual Render URL
const configuredBase = import.meta.env.VITE_API_URL?.trim();
const API_BASE_URL = configuredBase || (import.meta.env.DEV ? 'http://localhost:4000' : RENDER_FALLBACK);

export function getApiBaseUrl() {
  return API_BASE_URL;
}

/** Timeout (ms) — generous to allow for Render free-tier cold starts. */
const REQUEST_TIMEOUT_MS = 20_000;

export async function runLabelVerification(fields, signal) {
  const { payload, normalization } = buildVerificationPayload(fields);

  // Combine the caller's abort signal with a timeout so Render cold-starts don't hang forever
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/label-checks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: combined,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err; // let caller handle user-initiated aborts
    if (err?.name === 'TimeoutError') {
      throw new Error('The verification service is taking too long to respond. It may be waking up — please try again in a moment.');
    }
    throw new Error('Could not reach the verification service. Check your internet connection and try again.');
  }

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

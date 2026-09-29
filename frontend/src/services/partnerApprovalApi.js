import { getApiBaseUrl } from './api';

async function readJson(response) {
  return response.json().catch(() => null);
}

function errorMessage(response, body) {
  return body?.error?.message || `Request failed (${response.status}).`;
}

export async function reviewPartnerApproval(token, accessToken, signal) {
  const response = await fetch(`${getApiBaseUrl()}/api/partner-applications/review?token=${encodeURIComponent(token)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });
  const body = await readJson(response);
  if (!response.ok) {
    const error = new Error(errorMessage(response, body));
    error.code = body?.error?.code;
    throw error;
  }
  return body;
}

export async function approvePartnerFromEmail(token, accessToken, signal) {
  const response = await fetch(`${getApiBaseUrl()}/api/partner-applications/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ token }),
    signal,
  });
  const body = await readJson(response);
  if (!response.ok) {
    const error = new Error(errorMessage(response, body));
    error.code = body?.error?.code;
    throw error;
  }
  return body;
}

async function authedJson(path, accessToken, options = {}) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });
  const body = await readJson(response);
  if (!response.ok) {
    const error = new Error(errorMessage(response, body));
    error.code = body?.error?.code;
    throw error;
  }
  return body;
}

export function listPendingPartnerApplications(accessToken, signal) {
  return authedJson('/api/partner-applications/pending?limit=100', accessToken, { signal });
}

export function rejectPartnerApplication(token, accessToken, signal) {
  return authedJson('/api/partner-applications/reject', accessToken, {
    method: 'POST',
    body: JSON.stringify({ token }),
    signal,
  });
}

export function resendPartnerApplication(applicationId, accessToken, signal) {
  return authedJson('/api/partner-applications/resend', accessToken, {
    method: 'POST',
    body: JSON.stringify({ applicationId }),
    signal,
  });
}

export function getPartnerEmailStatus(accessToken, signal) {
  return authedJson('/api/partner-applications/email-status', accessToken, { signal });
}

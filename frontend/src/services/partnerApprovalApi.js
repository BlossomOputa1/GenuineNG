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

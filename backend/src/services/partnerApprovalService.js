import crypto from 'node:crypto';

const TOKEN_BYTES = 32;
const DEFAULT_EXPIRY_HOURS = 72;

export function generatePartnerApprovalToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('base64url');
}

export function hashPartnerApprovalToken(token) {
  const normalized = String(token || '').trim();
  if (!normalized) return '';
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function getPartnerApprovalExpiry(now = new Date()) {
  const configured = Number.parseInt(process.env.PARTNER_APPROVAL_TOKEN_HOURS || '', 10);
  const hours = Number.isFinite(configured) && configured > 0 && configured <= 168
    ? configured
    : DEFAULT_EXPIRY_HOURS;
  return new Date(now.getTime() + (hours * 60 * 60 * 1000)).toISOString();
}

export function getPublicAppUrl() {
  const explicit = String(process.env.PUBLIC_APP_URL || '').trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const origin = String(process.env.FRONTEND_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .find(Boolean);
  return (origin || 'http://localhost:4173').replace(/\/$/, '');
}

export function buildPartnerApprovalUrl(token) {
  return `${getPublicAppUrl()}/admin/partner-approval?token=${encodeURIComponent(token)}`;
}

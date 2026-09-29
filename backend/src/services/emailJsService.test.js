import test from 'node:test';
import assert from 'node:assert/strict';
import { getEmailJsStatus, getConfiguredPartnerAdminEmails } from './emailJsService.js';
import { getPartnerApprovalExpiry } from './partnerApprovalService.js';

function withEnv(overrides, fn) {
  const keys = [
    'EMAILJS_SERVICE_ID', 'VITE_EMAILJS_SERVICE_ID',
    'EMAILJS_PUBLIC_KEY', 'VITE_EMAILJS_PUBLIC_KEY',
    'EMAILJS_PRIVATE_KEY', 'EMAILJS_ACCESS_TOKEN',
    'EMAILJS_PARTNER_APPLICATION_TEMPLATE_ID', 'EMAILJS_PARTNER_APPROVED_TEMPLATE_ID',
    'VITE_EMAILJS_TEMPLATE_ID', 'EMAILJS_TEMPLATE_ID',
    'PARTNER_ADMIN_EMAILS', 'PUBLIC_APP_URL',
    'PARTNER_APPROVAL_TOKEN_HOURS',
  ];
  const saved = {};
  for (const key of keys) saved[key] = process.env[key];
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, overrides);
  try {
    fn();
  } finally {
    for (const key of keys) delete process.env[key];
    for (const [key, value] of Object.entries(saved)) {
      if (value !== undefined) process.env[key] = value;
    }
  }
}

test('email status reports not configured when admins or service keys missing', () => {
  withEnv({}, () => {
    const status = getEmailJsStatus();
    assert.equal(status.configured, false);
    assert.equal(status.adminCount, 0);
    assert.equal(getConfiguredPartnerAdminEmails().length, 0);
  });
});

test('email status reports configured with explicit templates', () => {
  withEnv({
    EMAILJS_SERVICE_ID: 'svc',
    EMAILJS_PUBLIC_KEY: 'pub',
    EMAILJS_PRIVATE_KEY: 'priv',
    EMAILJS_PARTNER_APPLICATION_TEMPLATE_ID: 'template_app',
    EMAILJS_PARTNER_APPROVED_TEMPLATE_ID: 'template_ok',
    PARTNER_ADMIN_EMAILS: 'Admin@Example.com, ops@example.com',
    PUBLIC_APP_URL: 'https://genuine-ng.vercel.app',
  }, () => {
    const status = getEmailJsStatus();
    assert.equal(status.configured, true);
    assert.equal(status.adminCount, 2);
    assert.equal(status.accessTokenConfigured, true);
    assert.equal(status.usingSharedFallbackTemplate, false);
    assert.deepEqual(getConfiguredPartnerAdminEmails(), ['admin@example.com', 'ops@example.com']);
  });
});

test('email status flags shared fallback template', () => {
  withEnv({
    EMAILJS_SERVICE_ID: 'svc',
    EMAILJS_PUBLIC_KEY: 'pub',
    PARTNER_ADMIN_EMAILS: 'admin@example.com',
  }, () => {
    const status = getEmailJsStatus();
    assert.equal(status.usingSharedFallbackTemplate, true);
  });
});

test('approval expiry clamps overlong configuration to default', () => {
  withEnv({ PARTNER_APPROVAL_TOKEN_HOURS: '999' }, () => {
    const before = Date.now();
    const expiry = new Date(getPartnerApprovalExpiry()).getTime();
    const hours = (expiry - before) / (60 * 60 * 1000);
    assert.ok(hours > 71 && hours <= 73);
  });
});

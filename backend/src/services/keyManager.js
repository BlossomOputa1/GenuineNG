// backend/src/services/keyManager.js
//
// Reads and holds the Ed25519 key pair. Private key never leaves this
// module — no function here returns it, logs it, or includes it in any
// error message. Fails fast at import time if the private key is missing
// or malformed, per the standing "validate env vars at startup" rule.

// backend/src/services/keyManager.js

import { createPrivateKey, createPublicKey } from 'node:crypto';

// Helper to sanitize PEM formatting passed via environment variables
function normalizePem(keyString) {
  if (!keyString) return '';
  return keyString
    .replace(/\\n/g, '\n') // Replace literal "\n" strings with real line breaks
    .replace(/\r/g, '')     // Strip carriage returns if copied from Windows
    .trim();
}

function loadPrivateKey() {
  const raw = process.env.GENUINENG_ED25519_PRIVATE_KEY;

  if (!raw) {
    console.error(
      'Missing required environment variable: GENUINENG_ED25519_PRIVATE_KEY'
    );
    process.exit(1);
  }

  const normalized = normalizePem(raw);

  try {
    return createPrivateKey({ key: normalized, format: 'pem' });
  } catch (err) {
    // Helpful debug tip: If it still fails, err is caught here
    console.error(
      'GENUINENG_ED25519_PRIVATE_KEY is set but could not be parsed as a valid PKCS8 PEM key.'
    );
    process.exit(1);
  }
}

function loadPublicKey() {
  const raw = process.env.GENUINENG_ED25519_PUBLIC_KEY;

  if (!raw) {
    console.error(
      'Missing required environment variable: GENUINENG_ED25519_PUBLIC_KEY'
    );
    process.exit(1);
  }

  const normalized = normalizePem(raw);

  try {
    return createPublicKey({ key: normalized, format: 'pem' });
  } catch {
    console.error(
      'GENUINENG_ED25519_PUBLIC_KEY is set but could not be parsed as a valid SPKI PEM key.'
    );
    process.exit(1);
  }
}

function loadKeyVersion() {
  const version = process.env.GENUINENG_KEY_VERSION;
  if (!version) {
    console.error(
      'Missing required environment variable: GENUINENG_KEY_VERSION'
    );
    process.exit(1);
  }
  return version;
}

const privateKey = loadPrivateKey();
const publicKey = loadPublicKey();
const keyVersion = loadKeyVersion();

export function getPrivateKey() {
  return privateKey;
}

export function getPublicKey() {
  return publicKey;
}

export function getKeyVersion() {
  return keyVersion;
}
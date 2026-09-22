// backend/src/services/keyManager.js
//
// Reads and holds the Ed25519 key pair. Private key never leaves this
// module — no function here returns it, logs it, or includes it in any
// error message. Fails fast at import time if the private key is missing
// or malformed, per the standing "validate env vars at startup" rule.

import { createPrivateKey, createPublicKey } from 'node:crypto';

function loadPrivateKey() {
  const raw = process.env.GENUINENG_ED25519_PRIVATE_KEY;

  if (!raw) {
    console.error(
      'Missing required environment variable: GENUINENG_ED25519_PRIVATE_KEY'
    );
    process.exit(1);
  }

  try {
    return createPrivateKey({ key: raw, format: 'pem', type: 'pkcs8' });
  } catch {
    // Deliberately no err.message in the log — a malformed-key parse
    // error can sometimes echo fragments of the input, and this is a
    // private key. Fail with a generic message only.
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

  try {
    return createPublicKey({ key: raw, format: 'pem', type: 'spki' });
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

// Loaded once at module import time (server startup), not per-request —
// matches "avoid heavy work inside request handlers."
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

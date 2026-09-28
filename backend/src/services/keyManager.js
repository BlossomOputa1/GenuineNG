import { createPrivateKey, createPublicKey } from 'node:crypto';

function normalizePem(keyString) {
  if (!keyString) return '';
  return String(keyString).replace(/\\n/g, '\n').replace(/\r/g, '').trim();
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parsePrivateKey(raw) {
  try {
    return createPrivateKey({ key: normalizePem(raw), format: 'pem' });
  } catch {
    fail('GENUINENG_ED25519_PRIVATE_KEY is set but could not be parsed as a valid PKCS8 PEM key.');
  }
}

function parsePublicKey(raw, label = 'GENUINENG_ED25519_PUBLIC_KEY') {
  try {
    return createPublicKey({ key: normalizePem(raw), format: 'pem' });
  } catch {
    fail(`${label} could not be parsed as a valid SPKI PEM public key.`);
  }
}

const keyVersion = String(process.env.GENUINENG_KEY_VERSION || '').trim();
if (!keyVersion) fail('Missing required environment variable: GENUINENG_KEY_VERSION');

const privateRaw = process.env.GENUINENG_ED25519_PRIVATE_KEY;
const publicRaw = process.env.GENUINENG_ED25519_PUBLIC_KEY;
if (!privateRaw) fail('Missing required environment variable: GENUINENG_ED25519_PRIVATE_KEY');
if (!publicRaw) fail('Missing required environment variable: GENUINENG_ED25519_PUBLIC_KEY');

const privateKey = parsePrivateKey(privateRaw);
const publicKeys = new Map([[keyVersion, parsePublicKey(publicRaw)]]);

// Optional key ring keeps previously-issued QR codes verifiable after the
// current signing key rotates. Format: {"1":"-----BEGIN PUBLIC KEY-----..."}.
if (process.env.GENUINENG_ED25519_PUBLIC_KEYS) {
  try {
    const ring = JSON.parse(process.env.GENUINENG_ED25519_PUBLIC_KEYS);
    for (const [version, pem] of Object.entries(ring || {})) {
      if (pem) publicKeys.set(String(version), parsePublicKey(pem, `public key version ${version}`));
    }
  } catch (error) {
    fail(`GENUINENG_ED25519_PUBLIC_KEYS must be valid JSON: ${error.message}`);
  }
}

export function getPrivateKey() {
  return privateKey;
}

export function getPublicKey(version = keyVersion) {
  return publicKeys.get(String(version)) || null;
}

export function getKeyVersion() {
  return keyVersion;
}

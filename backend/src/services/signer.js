import { sign as cryptoSign, verify as cryptoVerify } from "node:crypto";
import { getKeyVersion, getPrivateKey, getPublicKey } from "./keyManager.js";

function buildPayload({ productId, batchId, unitId, unitIndex, keyVersion }) {
  return {
    productId,
    batchId,
    unitId,
    unitIndex,
    keyVersion,
  };
}

function canonicalize(payload) {
  // JSON.stringify on an object built with a fixed key order (above)
  // is deterministic in V8/Node — no key-sorting library needed here,
  // since buildPayload always produces the same key order.
  return JSON.stringify(payload);
}

export function signUnit({ productId, batchId, unitIndex }) {
  const keyVersion = getKeyVersion();
  // Batch UUID is used rather than the human batch code so two different
  // manufacturers may safely use the same production batch label.
  const unitId = `${batchId}-${String(unitIndex).padStart(6, "0")}`;

  const payload = buildPayload({
    productId,
    batchId,
    unitId,
    unitIndex,
    keyVersion,
  });
  const message = Buffer.from(canonicalize(payload), "utf8");

  // Ed25519 signs the raw message directly — no separate hash algorithm
  // is passed (null), that's correct and required for this key type,
  // not an oversight.
  const signature = cryptoSign(null, message, getPrivateKey()).toString(
    "base64",
  );

  return {
    unitId,
    payload,
    signature,
    keyVersion,
  };
}

// Used by verify-code: rebuilds the exact same canonical message a
// scanned payload claims to represent, and checks the signature
// against the public key. Never throws on malformed input — this
// receives untrusted, unauthenticated data from any scanner, so a
// bad payload/signature simply verifies as false, not an error.
//
// Deliberately rebuilds the payload through buildPayload() using each
// field's VALUE, rather than trusting the caller's object key order.
// A scanned QR's JSON, or a payload round-tripped through Postgres's
// jsonb column, is not guaranteed to preserve the exact key order it
// was originally signed with — only the values matter for verification.
// Relying on the caller's key order here would make genuine codes
// fail verification purely due to reordering, not tampering.
export function verifySignature({ payload, signature }) {
  try {
    const canonicalPayload = buildPayload({
      productId: payload.productId,
      batchId: payload.batchId,
      unitId: payload.unitId,
      unitIndex: payload.unitIndex,
      keyVersion: payload.keyVersion,
    });
    const message = Buffer.from(canonicalize(canonicalPayload), "utf8");
    const signatureBuffer = Buffer.from(signature, "base64");
    const publicKey = getPublicKey(payload.keyVersion);
    if (!publicKey) return false;
    return cryptoVerify(null, message, publicKey, signatureBuffer);
  } catch {
    return false;
  }
}

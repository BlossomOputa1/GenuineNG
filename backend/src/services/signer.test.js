import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
process.env.GENUINENG_ED25519_PRIVATE_KEY = privateKey
  .export({ format: "pem", type: "pkcs8" })
  .toString();
process.env.GENUINENG_ED25519_PUBLIC_KEY = publicKey
  .export({ format: "pem", type: "spki" })
  .toString();
process.env.GENUINENG_KEY_VERSION = "test-v1";

const { signUnit, verifySignature } = await import("./signer.js");

test("signed unit verifies and tampering fails", () => {
  const signed = signUnit({
    productId: "product-id",
    batchId: "batch-id",
    batchCode: "BATCH",
    unitIndex: 1,
  });
  assert.equal(verifySignature(signed), true);
  assert.equal(
    verifySignature({
      ...signed,
      payload: { ...signed.payload, unitIndex: 2 },
    }),
    false,
  );
});

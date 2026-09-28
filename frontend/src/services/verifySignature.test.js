import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalPayload, parseSignedQr } from '../crypto/verifySignature.js';

test('parseSignedQr accepts a complete GenuineNG signed payload', () => {
  const payload = canonicalPayload({ productId: 'p1', batchId: 'b1', unitId: 'B-000001', unitIndex: 1, keyVersion: 'v1' });
  const parsed = parseSignedQr(JSON.stringify({ payload, signature: 'abc123' }));
  assert.deepEqual(parsed.payload, payload);
  assert.equal(parsed.signature, 'abc123');
});

test('parseSignedQr rejects plain or incomplete QR content', () => {
  assert.throws(() => parseSignedQr('https://example.com'), /readable GenuineNG code/);
  assert.throws(() => parseSignedQr(JSON.stringify({ payload: { unitId: 'x' }, signature: 'abc' })), /missing required/);
});

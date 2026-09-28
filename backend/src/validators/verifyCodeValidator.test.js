import test from 'node:test';
import assert from 'node:assert/strict';
import { validateVerifyCodeInput } from './verifyCodeValidator.js';

const valid = {
  payload: {
    productId: 'p1',
    batchId: 'b1',
    unitId: 'BATCH-000001',
    unitIndex: 1,
    keyVersion: '1',
  },
  signature: 'abc123',
};

test('verify-code validator accepts the signed payload shape', () => {
  assert.equal(validateVerifyCodeInput(valid).valid, true);
});

test('verify-code validator rejects missing signature', () => {
  const result = validateVerifyCodeInput({ payload: valid.payload });
  assert.equal(result.valid, false);
});

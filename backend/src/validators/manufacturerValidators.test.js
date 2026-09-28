import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBatchInput, validateProductInput } from './manufacturerValidators.js';

test('product validation accepts optional NAFDAC number', () => {
  const result = validateProductInput({ name: 'Demo Product', category: 'Food', nafdacNumber: '' });
  assert.equal(result.valid, true);
  assert.equal(result.data.nafdacNumber, null);
});

test('batch validation enforces the 100000 unit ceiling', () => {
  const result = validateBatchInput({
    productId: 'product-1',
    batchCode: 'BATCH-1',
    manufacturedDate: '2026-01-01',
    expiryDate: '2027-01-01',
    unitsProduced: 100001,
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /100000/);
});

test('batch validation requires expiry after manufacture date', () => {
  const result = validateBatchInput({
    productId: 'product-1',
    batchCode: 'BATCH-1',
    manufacturedDate: '2026-01-02',
    expiryDate: '2026-01-01',
    unitsProduced: 500,
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /later than/);
});

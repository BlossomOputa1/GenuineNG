import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLabelInput } from './labelInputValidator.js';

test('product name, manufacturer and registration number are required', () => {
  const result = validateLabelInput({ batchNumber: null, expiryDate: null, ingredients: [] });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('productName is required.'));
  assert.ok(result.errors.includes('manufacturer is required.'));
  assert.ok(result.errors.includes('registrationNumber is required.'));
});

test('optional batch, expiry and ingredients may be omitted', () => {
  const result = validateLabelInput({
    productName: 'Demo Product',
    manufacturer: 'Demo Ltd',
    registrationNumber: 'A1-1234',
  });
  assert.equal(result.valid, true);
});

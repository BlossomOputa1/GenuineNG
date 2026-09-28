import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLabelInput } from './labelInputValidator.js';

test('at least one current Layer 1 detail is required', () => {
  const result = validateLabelInput({ productName: '', manufacturer: '', registrationNumber: '', expiryDate: null });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('Provide at least one label detail to check.'));
});

test('registration-only input is valid', () => {
  const result = validateLabelInput({ registrationNumber: 'A1-1234' });
  assert.equal(result.valid, true);
});

test('expiry-only input is valid when it is a real ISO date', () => {
  const result = validateLabelInput({ expiryDate: '2028-12-31' });
  assert.equal(result.valid, true);
});

test('invalid calendar dates are rejected', () => {
  const result = validateLabelInput({ expiryDate: '2027-02-31' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('expiryDate must be a real calendar date.'));
});

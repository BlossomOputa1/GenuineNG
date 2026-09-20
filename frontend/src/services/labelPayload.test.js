import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVerificationPayload, normalizeExpiryDate } from './labelPayload.js';

test('month/year expiry becomes the last day of that month', () => {
  const result = normalizeExpiryDate('12/2027');
  assert.equal(result.value, '2027-12-31');
  assert.match(result.note, /last day/i);
});

test('leap-year month/year expiry is normalized correctly', () => {
  assert.equal(normalizeExpiryDate('02/2028').value, '2028-02-29');
});

test('only the four current Layer 1 fields are sent to the backend', () => {
  const { payload } = buildVerificationPayload({
    productName: ' Product A ',
    manufacturer: ' Maker ',
    registrationNumber: ' REG-1 ',
    expiryDate: '01/2028',
    batchNumber: 'legacy-value',
    ingredients: 'legacy-value',
  });
  assert.deepEqual(payload, {
    productName: 'Product A',
    manufacturer: 'Maker',
    registrationNumber: 'REG-1',
    expiryDate: '2028-01-31',
  });
});

test('impossible calendar dates are rejected before the API call', () => {
  assert.throws(() => normalizeExpiryDate('2027-02-31'), /real calendar date/i);
  assert.throws(() => normalizeExpiryDate('31/02/2027'), /real calendar date/i);
});

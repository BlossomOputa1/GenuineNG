import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVerificationPayload, normalizeExpiryDate, splitIngredients } from './labelPayload.js';

test('ingredient textarea is converted to an array', () => {
  assert.deepEqual(splitIngredients('Water, Sugar; Salt\nFlavour'), ['Water', 'Sugar', 'Salt', 'Flavour']);
});

test('month/year expiry becomes the last day of that month', () => {
  const result = normalizeExpiryDate('12/2027');
  assert.equal(result.value, '2027-12-31');
  assert.match(result.note, /last day/i);
});

test('leap-year month/year expiry is normalized correctly', () => {
  assert.equal(normalizeExpiryDate('02/2028').value, '2028-02-29');
});

test('printed fields are converted to the backend contract', () => {
  const { payload } = buildVerificationPayload({
    productName: ' Product A ',
    manufacturer: ' Maker ',
    registrationNumber: ' REG-1 ',
    batchNumber: ' LOT-2 ',
    expiryDate: '01/2028',
    ingredients: 'Water, Sugar',
  });
  assert.equal(payload.productName, 'Product A');
  assert.equal(payload.expiryDate, '2028-01-31');
  assert.deepEqual(payload.ingredients, ['Water', 'Sugar']);
});


test('impossible calendar dates are rejected before the API call', () => {
  assert.throws(() => normalizeExpiryDate('2027-02-31'), /real calendar date/i);
  assert.throws(() => normalizeExpiryDate('31/02/2027'), /real calendar date/i);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeExtractedFields, normalizeExtractedFields } from './labelExtractor.js';

test('normalizes Gemini extraction fields without inventing values', () => {
  assert.deepEqual(normalizeExtractedFields({
    productName: '  Product A  ',
    manufacturer: ' Maker Ltd ',
    registrationNumber: ' A1-1234 ',
    expiryDate: '2028-12-31',
  }), {
    productName: 'Product A',
    manufacturer: 'Maker Ltd',
    registrationNumber: 'A1-1234',
    expiryDate: '2028-12-31',
  });
});

test('invalid expiry from Gemini is discarded instead of guessed', () => {
  assert.equal(normalizeExtractedFields({ expiryDate: 'DEC 2028' }).expiryDate, null);
  assert.equal(normalizeExtractedFields({ expiryDate: '2028-02-31' }).expiryDate, null);
});

test('front and back extraction results merge by filling missing values', () => {
  assert.deepEqual(
    mergeExtractedFields(
      { productName: 'Product A', manufacturer: 'Maker Ltd', registrationNumber: null, expiryDate: null },
      { productName: null, manufacturer: null, registrationNumber: 'A1-1234', expiryDate: '2028-12-31' },
    ),
    { productName: 'Product A', manufacturer: 'Maker Ltd', registrationNumber: 'A1-1234', expiryDate: '2028-12-31' },
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { hasEnoughOcrSignal } from './fieldExtractor.js';

test('OCR only proceeds automatically when product, manufacturer and registration number are present', () => {
  assert.equal(hasEnoughOcrSignal({ fields: {
    productName: 'Demo Product',
    manufacturer: 'Demo Ltd',
    registrationNumber: 'A1-1234',
  }}), true);

  assert.equal(hasEnoughOcrSignal({ fields: {
    productName: 'Demo Product',
    manufacturer: 'Demo Ltd',
    registrationNumber: '',
    batchNumber: 'B-1',
    expiryDate: '12/2027',
    ingredients: 'Water',
  }}), false);
});

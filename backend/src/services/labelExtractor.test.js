import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXTRACTION_PROMPT, mergeExtractedFields, normalizeExtractedFields } from './labelExtractor.js';

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

test('back-panel maker wins over front distributor name', () => {
  // The reported bug: front shows "Marketed/Distributed by" copy, back shows
  // the real "Mfd by" maker. Back must win for maker/regulatory fields while
  // the front brand name is still preferred for productName.
  assert.deepEqual(
    mergeExtractedFields(
      { productName: 'Emzoron Blood Tonic', manufacturer: 'XYZ Distributors Ltd', registrationNumber: null, expiryDate: null },
      { productName: 'Emzoron Blood Tonic', manufacturer: 'Fidson Healthcare Plc', registrationNumber: 'A4-1234', expiryDate: '2028-08-31' },
    ),
    { productName: 'Emzoron Blood Tonic', manufacturer: 'Fidson Healthcare Plc', registrationNumber: 'A4-1234', expiryDate: '2028-08-31' },
  );
});

test('front maker is kept when the back panel has no maker line', () => {
  assert.deepEqual(
    mergeExtractedFields(
      { productName: 'Product A', manufacturer: 'Maker Ltd', registrationNumber: null, expiryDate: null },
      { productName: null, manufacturer: null, registrationNumber: 'A1-1234', expiryDate: '2028-12-31' },
    ).manufacturer,
    'Maker Ltd',
  );
});

test('maker prefixes are stripped and distributor-only lines become null', () => {
  assert.equal(
    normalizeExtractedFields({ manufacturer: 'Mfd by Fidson Healthcare Plc' }).manufacturer,
    'Fidson Healthcare Plc',
  );
  assert.equal(
    normalizeExtractedFields({ manufacturer: 'Manufactured by: Emzor Pharmaceutical Ltd' }).manufacturer,
    'Emzor Pharmaceutical Ltd',
  );
  assert.equal(
    normalizeExtractedFields({ manufacturer: 'Marketed by XYZ Distributors Ltd' }).manufacturer,
    null,
  );
  assert.equal(
    normalizeExtractedFields({ manufacturer: 'Distributed by XYZ Ltd' }).manufacturer,
    null,
  );
});

test('registration number labels are stripped to the number token', () => {
  assert.equal(
    normalizeExtractedFields({ registrationNumber: 'NAFDAC Reg No: A4-1234' }).registrationNumber,
    'A4-1234',
  );
});

test('extraction prompt enforces strict maker hierarchy', () => {
  assert.match(EXTRACTION_PROMPT, /NEVER.*Marketed by/s);
  assert.match(EXTRACTION_PROMPT, /Mfd by/);
  assert.match(EXTRACTION_PROMPT, /THIS photo/);
});

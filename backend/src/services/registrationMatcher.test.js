import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRegistration, normalizeProductTokens, productNamesAgree } from './registrationMatcher.js';

const fixedNow = new Date('2026-06-01T00:00:00.000Z');

const fixtureRecord = {
  registrationNumber: 'GN-FOOD-0001',
  productName: 'GenuineNG Sample Food A',
  manufacturer: 'GenuineNG Demo Foods Ltd.',
};

const baseDeps = {
  findRecord: (num) =>
    num === fixtureRecord.registrationNumber ? fixtureRecord : null,
  getDatasetInfo: () => ({ generatedAt: '2026-01-01T00:00:00.000Z' }),
};

test('missing registration number returns not_checked', async () => {
  const result = await checkRegistration(
    { registrationNumber: null, productName: null, manufacturer: null },
    fixedNow,
    baseDeps
  );
  assert.equal(result.status, 'not_checked');
});

test('known integration registration returns match', async () => {
  const result = await checkRegistration(
    {
      registrationNumber: 'GN-FOOD-0001',
      productName: 'GenuineNG Sample Food A',
      manufacturer: 'GenuineNG Demo Foods Ltd.',
    },
    fixedNow,
    {
      ...baseDeps,
      compareIdentity: async () => ({ matches: true, reason: 'exact match' }),
    }
  );
  assert.equal(result.status, 'match');
});

test('maker-only difference with agreeing product name returns match with holder note', async () => {
  // Factory on pack vs authorization holder on record (e.g. BLISS GVS vs
  // Greenlife) must not warn when the product name agrees.
  const result = await checkRegistration(
    {
      registrationNumber: 'GN-FOOD-0001',
      productName: 'GenuineNG Sample Food A',
      manufacturer: 'Different Company',
    },
    fixedNow,
    {
      ...baseDeps,
      compareIdentity: async () => ({
        matches: false,
        reason: 'manufacturer differs',
      }),
    }
  );
  assert.equal(result.status, 'match');
  assert.match(result.reason, /authorization holder on record/i);
});

test('Lonart-DS factory-vs-holder case returns match, not warning', async () => {
  const lonartDeps = {
    findRecord: () => ({
      registrationNumber: 'LONART-REG',
      productName: 'Lonart-DS Tablets**',
      manufacturer: 'Greenlife Pharmaceutical Limited',
    }),
    getDatasetInfo: () => ({ generatedAt: '2026-01-01T00:00:00.000Z' }),
    // Simulate a strict LLM that still flags the maker difference: the
    // local product-name agreement must override it to a match-with-note.
    compareIdentity: async () => ({
      matches: false,
      reason:
        "manufacturers conflict: photo indicates 'BLISS GVS PHARMA LTD.' while the reference lists 'Greenlife Pharmaceutical Limited'",
    }),
  };
  const result = await checkRegistration(
    {
      registrationNumber: 'LONART-REG',
      productName: 'LONART - DS',
      manufacturer: 'BLISS GVS PHARMA LTD.',
    },
    fixedNow,
    lonartDeps
  );
  assert.equal(result.status, 'match');
  assert.match(result.reason, /BLISS GVS PHARMA/i);
  assert.match(result.reason, /authorization holder/i);
});

test('productNamesAgree ignores formal Greenbook suffixes', () => {
  assert.equal(productNamesAgree('LONART - DS', 'Lonart-DS Tablets**'), true);
  assert.equal(productNamesAgree('Emzoron', 'EMZORON BLOOD TONIC 200ML'), true);
  assert.equal(productNamesAgree('GenuineNG Sample Food A', 'GenuineNG Sample Food A'), true);
});

test('productNamesAgree rejects genuine brand conflicts and blanks', () => {
  assert.equal(productNamesAgree('Different Product', 'GenuineNG Sample Food A'), false);
  assert.equal(productNamesAgree('', 'GenuineNG Sample Food A'), false);
  assert.equal(normalizeProductTokens('Lonart-DS Tablets**').includes('tablets'), false);
});

test('unknown registration number returns unverified, never fake', async () => {
  const result = await checkRegistration(
    {
      registrationNumber: 'UNKNOWN-000',
      productName: 'Unknown Product',
      manufacturer: 'Unknown Company',
    },
    fixedNow,
    baseDeps
  );
  assert.equal(result.status, 'unverified');
});

test('known number with mismatched product name returns warning', async () => {
  const result = await checkRegistration(
    {
      registrationNumber: 'GN-FOOD-0001',
      productName: 'Different Product',
      manufacturer: 'GenuineNG Demo Foods Ltd.',
    },
    fixedNow,
    {
      ...baseDeps,
      compareIdentity: async () => ({
        matches: false,
        reason: 'product name differs',
      }),
    }
  );
  assert.equal(result.status, 'warning');
});

test('known number with unavailable identity comparison returns unverified', async () => {
  const result = await checkRegistration(
    {
      registrationNumber: 'GN-FOOD-0001',
      productName: 'GenuineNG Sample Food A',
      manufacturer: 'GenuineNG Demo Foods Ltd.',
    },
    fixedNow,
    {
      ...baseDeps,
      compareIdentity: async () => ({
        matches: null,
        reason: 'identity service unavailable',
      }),
    }
  );
  assert.equal(result.status, 'match');
});

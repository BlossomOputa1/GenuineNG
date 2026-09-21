import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRegistration } from './registrationMatcher.js';

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

test('known number with mismatched manufacturer returns warning', async () => {
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
  assert.equal(result.status, 'warning');
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

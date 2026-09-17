import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkExpiry } from './expiryChecker.js';

const fixedNow = new Date('2026-06-01T00:00:00.000Z');

test('missing expiry date returns not_checked', () => {
  const result = checkExpiry(null, fixedNow);
  assert.equal(result.status, 'not_checked');
});

test('unparseable expiry date returns unverified', () => {
  const result = checkExpiry('not-a-date', fixedNow);
  assert.equal(result.status, 'unverified');
});

test('past expiry date returns warning', () => {
  const result = checkExpiry('2020-01-01', fixedNow);
  assert.equal(result.status, 'warning');
});

test('future expiry date returns match', () => {
  const result = checkExpiry('2030-01-01', fixedNow);
  assert.equal(result.status, 'match');
});

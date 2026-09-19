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

test('expiry date equal to today returns match', () => {
  const result = checkExpiry('2026-06-01', fixedNow); // same as fixedNow
  assert.equal(result.status, 'match');
});

test('leap year expiry date is handled correctly', () => {
  const result = checkExpiry('2028-02-29', fixedNow);
  assert.equal(result.status, 'match');
});

test('expiry date at end of month boundary', () => {
  const result = checkExpiry('2026-06-30', fixedNow);
  assert.equal(result.status, 'match');
});


test('impossible ISO calendar date returns unverified', () => {
  const result = checkExpiry('2027-02-31', fixedNow);
  assert.equal(result.status, 'unverified');
});

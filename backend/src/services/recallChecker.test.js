import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRecall } from './recallChecker.js';

test('missing batch number returns not_checked', () => {
  const result = checkRecall(null);
  assert.equal(result.status, 'not_checked');
});

test('recalled batch returns warning', () => {
  const result = checkRecall('B-2024-001');
  assert.equal(result.status, 'warning');
});

test('unrecalled batch returns not_checked, not a safety claim', () => {
  const result = checkRecall('B-9999-999');
  assert.equal(result.status, 'not_checked');
});

test('known non-recalled batch (explicitly cleared) returns match', () => {
  const result = checkRecall('B-2024-050');
  assert.equal(result.status, 'match');
});
test('unknown batch (absent from both lists) still returns not_checked, not match', () => {
  const result = checkRecall('B-0000-000');
  assert.equal(result.status, 'not_checked');
});

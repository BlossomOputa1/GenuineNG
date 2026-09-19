import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildScore, checksObjectToArray } from './resultModel.js';

test('verification score uses all four checks as the denominator', () => {
  const result = buildScore([
    { status: 'match' },
    { status: 'match' },
    { status: 'match' },
    { status: 'not_checked' },
  ]);
  assert.equal(result.score, 75);
  assert.equal(result.band, 'medium');
});

test('warnings and unverified checks earn no points', () => {
  const result = buildScore([
    { status: 'match' },
    { status: 'warning' },
    { status: 'unverified' },
    { status: 'not_checked' },
  ]);
  assert.equal(result.score, 25);
  assert.equal(result.band, 'bad');
});

test('all not_checked returns insufficient instead of zero', () => {
  const result = buildScore([
    { status: 'not_checked' },
    { status: 'not_checked' },
    { status: 'not_checked' },
    { status: 'not_checked' },
  ]);
  assert.equal(result.score, null);
  assert.equal(result.band, 'insufficient');
});

test('backend check object is adapted in stable UI order', () => {
  const checks = checksObjectToArray({
    ingredients: { status: 'match', reason: 'ok' },
    expiry: { status: 'match', reason: 'ok' },
    registration: { status: 'unverified', reason: 'unknown' },
    recall: { status: 'not_checked', reason: 'limited coverage' },
  });
  assert.deepEqual(checks.map(item => item.key), ['registration', 'expiry', 'recall', 'ingredients']);
});

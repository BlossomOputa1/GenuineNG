import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkIngredients } from './ingredientChecker.js';

test('missing ingredients returns not_checked', () => {
  const result = checkIngredients(null);
  assert.equal(result.status, 'not_checked');
});

test('empty ingredients array returns not_checked', () => {
  const result = checkIngredients([]);
  assert.equal(result.status, 'not_checked');
});

test('clean ingredient list returns match', () => {
  const result = checkIngredients(['sugar', 'water', 'citric acid']);
  assert.equal(result.status, 'match');
});

test('ingredient list containing a flagged substance returns warning', () => {
  const result = checkIngredients(['sugar', 'sibutramine']);
  assert.equal(result.status, 'warning');
});

test('missing ingredients returns not_checked with checkedAt', () => {
  const result = checkIngredients(null);
  assert.equal(result.status, 'not_checked');
  assert.ok(result.checkedAt);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRegistration } from './registrationMatcher.js';

test('missing registration number returns not_checked', () => {
  assert.equal(checkRegistration(null, null, null).status, 'not_checked');
});

test('known integration registration returns match', () => {
  assert.equal(checkRegistration('GN-FOOD-0001', 'GenuineNG Sample Food A', 'GenuineNG Demo Foods Ltd.').status, 'match');
});

test('known number with mismatched manufacturer returns warning', () => {
  assert.equal(checkRegistration('GN-FOOD-0001', 'GenuineNG Sample Food A', 'Different Company').status, 'warning');
});

test('unknown registration number returns unverified, never fake', () => {
  assert.equal(checkRegistration('UNKNOWN-000', 'Unknown Product', 'Unknown Company').status, 'unverified');
});


test('known number with mismatched product name returns warning', () => {
  assert.equal(checkRegistration('GN-FOOD-0001', 'Different Product', 'GenuineNG Demo Foods Ltd.').status, 'warning');
});

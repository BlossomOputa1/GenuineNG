import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRegistration } from './registrationMatcher.js';

test('missing registration number returns not_checked', () => {
  const result = checkRegistration(null);
  assert.equal(result.status, 'not_checked');
});

test('known registration number returns match', () => {
  const result = checkRegistration('NAFDAC-A4-1234');
  assert.equal(result.status, 'match');
});

test('unknown registration number returns unverified, never fake', () => {
  const result = checkRegistration('FAKE-000');
  assert.equal(result.status, 'unverified');
});

test('whitespace-only registration number returns not_checked, treated as missing', () => {
  const result = checkRegistration('   ');
  assert.equal(result.status, 'not_checked');
});

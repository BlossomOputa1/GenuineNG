import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checksObjectToArray, deriveCompletionState, verdictForChecks } from './resultModel.js';

test('backend check object is adapted to registration then expiry', () => {
  const checks = checksObjectToArray({
    expiry: { status: 'match', reason: 'ok' },
    registration: { status: 'unverified', reason: 'unknown' },
  });
  assert.deepEqual(checks.map(item => item.key), ['registration', 'expiry']);
});

test('unverified is a completed check, not a failed request', () => {
  const state = deriveCompletionState([
    { status: 'unverified' },
    { status: 'match' },
  ]);
  assert.equal(state.title, 'Checks complete');
  assert.equal(state.completed, 2);
});

test('missing expiry produces a partial result', () => {
  const state = deriveCompletionState([
    { status: 'match' },
    { status: 'not_checked' },
  ]);
  assert.equal(state.title, 'Checks partially complete');
  assert.equal(state.completed, 1);
});

test('warnings are surfaced without creating a numeric score', () => {
  const state = deriveCompletionState([
    { status: 'warning' },
    { status: 'match' },
  ]);
  assert.equal(state.title, 'Checks complete — attention needed');
  assert.equal(state.hasWarning, true);
});


test('unverified registration uses the current verdict wording', () => {
  const verdict = verdictForChecks([
    { key: 'registration', status: 'unverified' },
    { key: 'expiry', status: 'match' },
  ]);
  assert.equal(
    verdict,
    'The registration could not be confirmed from the current Greenbook dataset. The product may not be fake. GenuineNG could not verify that record from the source currently available.'
  );
});

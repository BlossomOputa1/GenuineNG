import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePartnerApprovalToken, hashPartnerApprovalToken } from './partnerApprovalService.js';

test('partner approval tokens are random and hash deterministically', () => {
  const first = generatePartnerApprovalToken();
  const second = generatePartnerApprovalToken();
  assert.notEqual(first, second);
  assert.ok(first.length >= 40);
  assert.equal(hashPartnerApprovalToken(first), hashPartnerApprovalToken(first));
  assert.notEqual(hashPartnerApprovalToken(first), hashPartnerApprovalToken(second));
});

test('empty approval tokens do not produce a usable hash', () => {
  assert.equal(hashPartnerApprovalToken(''), '');
  assert.equal(hashPartnerApprovalToken('   '), '');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePartnerApplication } from './partnerApplicationValidator.js';

test('partner application validator accepts valid input and lowercases email', () => {
  const result = validatePartnerApplication({
    companyName: 'Acme Foods',
    contactPersonName: 'Adaeze Obi',
    businessEmail: '  Contact@AcmeFoods.com ',
    phoneNumber: '+2348012345678',
  });
  assert.equal(result.valid, true);
  assert.equal(result.data.businessEmail, 'contact@acmefoods.com');
});

test('partner application validator rejects bad email and short names', () => {
  const result = validatePartnerApplication({
    companyName: 'A',
    contactPersonName: 'B',
    businessEmail: 'not-an-email',
    phoneNumber: '123',
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 3);
});

test('partner application validator rejects overlong fields', () => {
  const result = validatePartnerApplication({
    companyName: 'x'.repeat(161),
    contactPersonName: 'Adaeze Obi',
    businessEmail: 'a@b.co',
    phoneNumber: '+2348012345678',
  });
  assert.equal(result.valid, false);
});

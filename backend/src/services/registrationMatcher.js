/**
 * MOCK reference data — swap this for a real Supabase query or
 * Part 5's dataset later. The function signature below is the only
 * thing other code depends on, so the swap won't touch callers.
 */
const MOCK_REGISTRATIONS = [
  { registrationNumber: 'NAFDAC-A4-1234', manufacturer: 'Example Foods Ltd' },
  { registrationNumber: 'NAFDAC-B7-5678', manufacturer: 'Sample Beverages Co' },
];

export function checkRegistration(registrationNumber, now = new Date()) {
  if (!registrationNumber || registrationNumber.trim() === '') {
    return {
      status: 'not_checked',
      reason: 'No registration number provided.',
    };
  }

  const record = MOCK_REGISTRATIONS.find(
    (r) => r.registrationNumber === registrationNumber
  );

  if (!record) {
    return {
      status: 'unverified',
      reason: 'No matching registration record found.',
      checkedAt: now.toISOString(),
    };
  }

  return {
    status: 'match',
    reason: `Registered to ${record.manufacturer}.`,
    source: 'mock-reference-data',
    checkedAt: now.toISOString(),
  };
}

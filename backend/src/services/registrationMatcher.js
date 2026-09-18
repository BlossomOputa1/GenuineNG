const MOCK_REGISTRATIONS = [
  { registrationNumber: 'NAFDAC-A4-1234', manufacturer: 'Example Foods Ltd' },
  { registrationNumber: 'NAFDAC-B7-5678', manufacturer: 'Sample Beverages Co' },
];

export function checkRegistration(registrationNumber, now = new Date()) {
  if (!registrationNumber || registrationNumber.trim() === '') {
    return {
      status: 'not_checked',
      reason: 'No registration number provided.',
      checkedAt: now.toISOString(),
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

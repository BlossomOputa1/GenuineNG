/**
 * MOCK recall list — same pattern as registrationMatcher.
 * A batch absent from this list is "not_checked", never assumed safe.
 */
const MOCK_RECALLS = [
  { batchNumber: 'B-2024-001', reason: 'Contamination reported.' },
];

export function checkRecall(batchNumber, now = new Date()) {
  if (!batchNumber) {
    return {
      status: 'not_checked',
      reason: 'No batch number provided.',
    };
  }

  const recalled = MOCK_RECALLS.find((r) => r.batchNumber === batchNumber);

  if (recalled) {
    return {
      status: 'warning',
      reason: recalled.reason,
      source: 'mock-recall-data',
      checkedAt: now.toISOString(),
    };
  }

  return {
    status: 'not_checked',
    reason:
      'No recall record found in current dataset (not a confirmation of safety).',
    checkedAt: now.toISOString(),
  };
}

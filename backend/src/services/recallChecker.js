/**
 * MOCK recall list — same pattern as registrationMatcher.
 * A batch absent from BOTH lists below is "not_checked", never assumed safe.
 */
const MOCK_RECALLS = [
  { batchNumber: 'B-2024-001', reason: 'Contamination reported.' },
];

/**
 * Batches explicitly reviewed and confirmed NOT recalled — distinct from
 * a batch that simply isn't in our dataset at all. "No recall found in
 * our dataset" and "confirmed not recalled" are different claims; this
 * list is what makes the second claim possible.
 */
const MOCK_CLEARED_BATCHES = [{ batchNumber: 'B-2024-050' }];

export function checkRecall(batchNumber, now = new Date()) {
  if (!batchNumber || batchNumber.trim() === '') {
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

  const cleared = MOCK_CLEARED_BATCHES.find(
    (r) => r.batchNumber === batchNumber
  );

  if (cleared) {
    return {
      status: 'match',
      reason: 'Batch reviewed and confirmed not recalled.',
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

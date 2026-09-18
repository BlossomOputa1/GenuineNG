const MOCK_RECALLS = [
  { batchNumber: 'B-2024-001', reason: 'Contamination reported.' },
];

const MOCK_CLEARED_BATCHES = [{ batchNumber: 'B-2024-050' }];

export function checkRecall(batchNumber, now = new Date()) {
  if (!batchNumber || batchNumber.trim() === '') {
    return {
      status: 'not_checked',
      reason: 'No batch number provided.',
      checkedAt: now.toISOString(),
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

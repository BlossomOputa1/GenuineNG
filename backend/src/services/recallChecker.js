import { recallReference } from './referenceData.js';

function normalize(value = '') {
  return String(value).trim().toUpperCase().replace(/\s+/g, ' ');
}

export function checkRecall(batchNumber, registrationNumber, now = new Date()) {
  if (!batchNumber || batchNumber.trim() === '') {
    return {
      status: 'not_checked',
      reason: 'No batch number was available to check.',
      checkedAt: now.toISOString(),
    };
  }

  const batch = normalize(batchNumber);
  const registration = normalize(registrationNumber);
  const recalled = recallReference.recalls.find(item => {
    const sameBatch = normalize(item.batchNumber) === batch;
    const sameRegistration = !item.registrationNumber || normalize(item.registrationNumber) === registration;
    return sameBatch && sameRegistration;
  });

  if (recalled) {
    return {
      status: 'warning',
      reason: recalled.reason || 'This batch appears in a sourced recall record.',
      source: recalled.sourceUrl || 'Sourced recall record',
      checkedAt: now.toISOString(),
    };
  }

  return {
    status: 'not_checked',
    reason: 'No matching recall was found in the current limited recall snapshot. This is not confirmation that the batch is safe.',
    source: recallReference.meta?.source || null,
    coverageNote: recallReference.meta?.coverage || null,
    checkedAt: now.toISOString(),
  };
}

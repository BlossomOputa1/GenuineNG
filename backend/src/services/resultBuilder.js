import { checkExpiry } from './expiryChecker.js';
import { checkRegistration } from './registrationMatcher.js';
import { checkRecall } from './recallChecker.js';

export function buildResult({ expiryDate, registrationNumber, batchNumber }) {
  const now = new Date();

  const checks = {
    registration: checkRegistration(registrationNumber, now),
    expiry: checkExpiry(expiryDate, now),
    recall: checkRecall(batchNumber, now),
  };

  return {
    status: 'completed',
    checks,
    summary: buildSummary(checks),
    checkedAt: now.toISOString(),
  };
}

function buildSummary(checks) {
  const statuses = Object.values(checks).map((c) => c.status);
  return {
    hasWarning: statuses.includes('warning'),
    allNotChecked: statuses.every((s) => s === 'not_checked'),
  };
}

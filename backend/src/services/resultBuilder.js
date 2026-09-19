import { checkExpiry } from './expiryChecker.js';
import { checkRegistration } from './registrationMatcher.js';

export async function buildResult({
  expiryDate,
  registrationNumber,
  productName,
  manufacturer,
}) {
  const now = new Date();

  const checks = {
    registration: await checkRegistration(
      { registrationNumber, productName, manufacturer },
      now
    ),
    expiry: checkExpiry(expiryDate, now),
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

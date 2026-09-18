export function checkExpiry(expiryDate, now = new Date()) {
  if (!expiryDate) {
    return {
      status: 'not_checked',
      reason: 'No expiry date provided.',
      checkedAt: now.toISOString(),
    };
  }

  const parsed = new Date(expiryDate);

  if (isNaN(parsed.getTime())) {
    return {
      status: 'unverified',
      reason: 'Expiry date could not be parsed.',
      checkedAt: now.toISOString(),
    };
  }

  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const expiry = new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
  );

  if (expiry < today) {
    return {
      status: 'warning',
      reason: `Expired on ${expiryDate}.`,
      checkedAt: now.toISOString(),
    };
  }

  return {
    status: 'match',
    reason: `Valid until ${expiryDate}.`,
    checkedAt: now.toISOString(),
  };
}

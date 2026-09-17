/**
 * Checks whether a product's expiry date has passed.
 * `now` is passed in (not read from the system clock) so this stays
 * deterministic and testable without depending on the real date.
 */
export function checkExpiry(expiryDate, now = new Date()) {
  if (!expiryDate) {
    return {
      status: 'not_checked',
      reason: 'No expiry date provided.',
    };
  }

  const parsed = new Date(expiryDate);

  if (isNaN(parsed.getTime())) {
    return {
      status: 'unverified',
      reason: 'Expiry date could not be parsed.',
    };
  }

  // Compared in UTC so server locale never changes the result.
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

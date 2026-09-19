function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) return null;
  return candidate;
}

export function checkExpiry(expiryDate, now = new Date()) {
  if (!expiryDate) {
    return { status: 'not_checked', reason: 'No expiry date provided.', source: 'Printed expiry date', checkedAt: now.toISOString() };
  }

  const parsed = parseIsoDate(expiryDate);
  if (!parsed) {
    return { status: 'unverified', reason: 'Expiry date could not be parsed.', source: 'Printed expiry date', checkedAt: now.toISOString() };
  }

  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (parsed < today) {
    return { status: 'warning', reason: `Expired on ${expiryDate}.`, source: 'Printed expiry date', checkedAt: now.toISOString() };
  }

  return { status: 'match', reason: `Valid until ${expiryDate}.`, source: 'Printed expiry date', checkedAt: now.toISOString() };
}

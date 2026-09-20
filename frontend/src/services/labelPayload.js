export function splitIngredients(value = '') {
  return String(value)
    .split(/[,;\n]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isRealDate(year, month, day) {
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

export function normalizeExpiryDate(value = '') {
  const raw = String(value).trim();
  if (!raw) return { value: null, note: '' };

  const cleaned = raw
    .replace(/^(?:EXP(?:IRY|IRES)?(?:\s*DATE)?|BEST\s*BEFORE|BB)\s*[:#\-]?\s*/i, '')
    .trim();

  const iso = cleaned.match(/^(20\d{2})-(\d{2})-(\d{2})$/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (!isRealDate(year, month, day)) throw new Error('Expiry date is not a real calendar date.');
    return { value: `${iso[1]}-${iso[2]}-${iso[3]}`, note: '' };
  }

  const dayMonthYear = cleaned.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2}|\d{2})$/);
  if (dayMonthYear) {
    const day = Number(dayMonthYear[1]);
    const month = Number(dayMonthYear[2]);
    const year = Number(dayMonthYear[3].length === 2 ? `20${dayMonthYear[3]}` : dayMonthYear[3]);
    if (!isRealDate(year, month, day)) throw new Error('Expiry date is not a real calendar date.');
    return {
      value: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      note: '',
    };
  }

  const monthYear = cleaned.match(/^(0?[1-9]|1[0-2])[\/.\-](20\d{2}|\d{2})$/);
  if (monthYear) {
    const month = Number(monthYear[1]);
    const year = Number(monthYear[2].length === 2 ? `20${monthYear[2]}` : monthYear[2]);
    const day = lastDayOfMonth(year, month);
    return {
      value: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      note: 'The printed expiry shows only month/year, so GenuineNG checks it through the last day of that month.',
    };
  }

  throw new Error('Expiry date could not be understood. Use a format such as 12/2027 or 2027-12-31.');
}

export function buildVerificationPayload(fields) {
  const expiry = normalizeExpiryDate(fields.expiryDate);
  return {
    payload: {
      productName: fields.productName?.trim() || null,
      manufacturer: fields.manufacturer?.trim() || null,
      registrationNumber: fields.registrationNumber?.trim() || null,
      batchNumber: fields.batchNumber?.trim() || null,
      expiryDate: expiry.value,
      ingredients: splitIngredients(fields.ingredients),
    },
    normalization: { expiryNote: expiry.note },
  };
}

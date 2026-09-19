const CHECK_META = {
  registration: { title: 'Registration record', order: 0 },
  expiry: { title: 'Expiry date', order: 1 },
  recall: { title: 'Batch recall', order: 2 },
  ingredients: { title: 'Ingredient flags', order: 3 },
};

export function checksObjectToArray(checks = {}) {
  return Object.entries(checks)
    .map(([key, value]) => ({
      key,
      title: CHECK_META[key]?.title || key,
      status: value?.status || 'not_checked',
      reason: value?.reason || 'No explanation was returned.',
      source: value?.source || null,
      checkedAt: value?.checkedAt || null,
      coverageNote: value?.coverageNote || null,
      matchedRecord: value?.matchedRecord || null,
    }))
    .sort((a, b) => (CHECK_META[a.key]?.order ?? 99) - (CHECK_META[b.key]?.order ?? 99));
}

export function buildScore(checksArray = []) {
  const total = checksArray.length;
  if (!total) return { score: null, matched: 0, total: 0, band: 'insufficient' };
  const matched = checksArray.filter(check => check.status === 'match').length;
  const allNotChecked = checksArray.every(check => check.status === 'not_checked');
  if (allNotChecked) return { score: null, matched: 0, total, band: 'insufficient' };
  const score = Math.round((matched / total) * 100);
  const band = score >= 80 ? 'good' : score >= 50 ? 'medium' : 'bad';
  return { score, matched, total, band };
}

export function recommendationForBand(band, hasWarning) {
  if (hasWarning) {
    return 'Something important was flagged. Review the warning and the individual checks before deciding what to do with the product.';
  }
  if (band === 'good') {
    return 'The available printed details were consistent with the reference checks that ran. Still inspect the seal, packaging and expiry yourself.';
  }
  if (band === 'medium') {
    return 'Some details matched, but the check is incomplete or unverified in places. Review the individual outcomes and consider checking again with clearer label information.';
  }
  if (band === 'bad') {
    return 'Several checks did not match or could not be verified. Do not rely on the percentage alone; review each result below and use extra caution.';
  }
  return 'There was not enough usable information to calculate a verification score.';
}

export function buildResultRecord(fields, response) {
  const checks = checksObjectToArray(response.checks);
  const score = buildScore(checks);
  const hasWarning = checks.some(check => check.status === 'warning');
  return {
    id: crypto.randomUUID(),
    checkedAt: response.checkedAt || new Date().toISOString(),
    fields: { ...fields },
    submitted: response.submitted || null,
    checks,
    verificationScore: score.score,
    scoreBand: score.band,
    matchedChecks: score.matched,
    totalChecks: score.total,
    hasWarning,
    warnings: checks.filter(check => check.status === 'warning'),
    recommendation: recommendationForBand(score.band, hasWarning),
    limitation: response.limitation || 'A label check cannot prove what is inside a sealed product or prove that packaging has not been copied.',
    expiryNormalizationNote: response.normalization?.expiryNote || '',
    dataset: response.dataset || null,
  };
}

export function formatResultForClipboard(result) {
  if (!result) return '';
  const fields = result.fields || {};
  const checks = (result.checks || [])
    .map(check => `${check.title}: ${check.status.replace('_', ' ')} — ${check.reason}`)
    .join('\n');
  return [
    'GenuineNG Layer 1 product check',
    `Product: ${fields.productName || 'Not provided'}`,
    `Manufacturer: ${fields.manufacturer || 'Not provided'}`,
    `Registration number: ${fields.registrationNumber || 'Not provided'}`,
    `Batch: ${fields.batchNumber || 'Not provided'}`,
    `Expiry as printed: ${fields.expiryDate || 'Not provided'}`,
    '',
    result.verificationScore === null ? 'Verification score: Not enough information' : `Verification score: ${result.verificationScore}% (${result.matchedChecks}/${result.totalChecks} checks matched)`,
    checks,
    '',
    `Recommendation: ${result.recommendation}`,
    `Limit: ${result.limitation}`,
  ].join('\n');
}

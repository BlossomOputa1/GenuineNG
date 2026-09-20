const CHECK_META = {
  registration: { title: 'Registration record', order: 0 },
  expiry: { title: 'Expiry date', order: 1 },
};

export function checksObjectToArray(checks = {}) {
  return Object.entries(checks)
    .filter(([key]) => key === 'registration' || key === 'expiry')
    .map(([key, value]) => ({
      key,
      title: CHECK_META[key]?.title || key,
      status: value?.status || 'not_checked',
      reason: value?.reason || 'No explanation was returned.',
      source: value?.source || null,
      checkedAt: value?.checkedAt || null,
      coverageNote: value?.coverageNote || null,
    }))
    .sort((a, b) => (CHECK_META[a.key]?.order ?? 99) - (CHECK_META[b.key]?.order ?? 99));
}

export function deriveCompletionState(checks = []) {
  const total = checks.length;
  const completed = checks.filter(check => check.status !== 'not_checked').length;
  const hasWarning = checks.some(check => check.status === 'warning');

  if (!total || completed === 0) {
    return {
      key: 'insufficient',
      title: 'Not enough information',
      detail: 'The available label details were not enough to complete a check.',
      completed,
      total,
      hasWarning,
    };
  }

  if (completed < total) {
    return {
      key: hasWarning ? 'partial-warning' : 'partial',
      title: hasWarning ? 'Checks partially complete — attention needed' : 'Checks partially complete',
      detail: `${completed} of ${total} checks completed.`,
      completed,
      total,
      hasWarning,
    };
  }

  return {
    key: hasWarning ? 'complete-warning' : 'complete',
    title: hasWarning ? 'Checks complete — attention needed' : 'Checks complete',
    detail: `${completed} of ${total} checks completed.`,
    completed,
    total,
    hasWarning,
  };
}

export function verdictForChecks(checks = []) {
  const registration = checks.find(check => check.key === 'registration');
  const expiry = checks.find(check => check.key === 'expiry');

  if (registration?.status === 'warning') {
    return 'The registration number is associated with a different product identity in the current reference data. Review the printed details carefully before relying on the product.';
  }
  if (expiry?.status === 'warning') {
    return 'The printed expiry date has passed. Do not rely on the registration result to override an expiry warning.';
  }
  if (registration?.status === 'unverified') {
    return 'The registration could not be confirmed from the current Greenbook dataset. The product may not be fake. GenuineNG could not verify that record from the source currently available.';
  }
  if (expiry?.status === 'not_checked') {
    return 'The registration check completed, but expiry could not be checked because no usable expiry date was provided.';
  }
  if (registration?.status === 'match' && expiry?.status === 'match') {
    return 'The printed registration details matched the current reference record and the supplied expiry date has not passed. This is useful evidence, but it does not prove the physical item itself is genuine.';
  }
  return 'Review the individual outcomes below. GenuineNG reports only what the available label details and current reference data can support.';
}

export function buildResultRecord(fields, response) {
  const checks = checksObjectToArray(response.checks);
  const completion = deriveCompletionState(checks);
  return {
    id: crypto.randomUUID(),
    checkedAt: response.checkedAt || new Date().toISOString(),
    fields: { ...fields },
    submitted: response.submitted || null,
    checks,
    completion,
    completedChecks: completion.completed,
    totalChecks: completion.total,
    hasWarning: completion.hasWarning,
    warnings: checks.filter(check => check.status === 'warning'),
    verdict: verdictForChecks(checks),
    expiryNormalizationNote: response.normalization?.expiryNote || '',
  };
}

export function formatResultForClipboard(result) {
  if (!result) return '';
  const fields = result.fields || {};
  const checks = (result.checks || [])
    .map(check => `${check.title}: ${check.status.replace('_', ' ')} — ${check.reason}`)
    .join('\n');
  const completion = result.completion || deriveCompletionState(result.checks || []);
  return [
    'GenuineNG Layer 1 product check',
    `Product: ${fields.productName || 'Not provided'}`,
    `Manufacturer: ${fields.manufacturer || 'Not provided'}`,
    `Registration number: ${fields.registrationNumber || 'Not provided'}`,
    `Expiry: ${fields.expiryDate || 'Not provided'}`,
    '',
    `${completion.title}: ${completion.detail}`,
    checks,
    '',
    `Verdict: ${result.verdict}`,
  ].join('\n');
}

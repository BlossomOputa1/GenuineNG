import { flaggedSubstances } from './referenceData.js';

function normalize(value = '') {
  return String(value).trim().toLowerCase();
}

export function checkIngredients(ingredients, now = new Date()) {
  if (!ingredients || ingredients.length === 0) {
    return {
      status: 'not_checked',
      reason: 'No ingredient list was available to check.',
      checkedAt: now.toISOString(),
    };
  }

  const joined = ingredients.map(normalize).join(' | ');
  const matchedRules = flaggedSubstances.rules.filter(rule => joined.includes(normalize(rule.term)));

  if (matchedRules.length > 0) {
    return {
      status: 'warning',
      reason: matchedRules.map(rule => rule.reason).join(' '),
      source: flaggedSubstances.meta?.sources?.[0] || 'Configured safety-rules dataset',
      checkedAt: now.toISOString(),
      matchedTerms: matchedRules.map(rule => rule.term),
    };
  }

  return {
    status: 'match',
    reason: 'No substance in the supplied ingredient text matched the current GenuineNG flagged-substance rules.',
    source: flaggedSubstances.meta?.sources?.[0] || 'Configured safety-rules dataset',
    coverageNote: flaggedSubstances.meta?.coverage || null,
    checkedAt: now.toISOString(),
  };
}

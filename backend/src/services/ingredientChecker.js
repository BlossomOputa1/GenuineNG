const MOCK_FLAGGED_SUBSTANCES = ['sibutramine', 'sildenafil', 'hydroquinone'];

export function checkIngredients(ingredients, now = new Date()) {
  if (!ingredients || ingredients.length === 0) {
    return {
      status: 'not_checked',
      reason: 'No ingredient list provided.',
      checkedAt: now.toISOString(),
    };
  }

  const flagged = ingredients.filter((i) =>
    MOCK_FLAGGED_SUBSTANCES.includes(i.toLowerCase().trim())
  );

  if (flagged.length > 0) {
    return {
      status: 'warning',
      reason: `Flagged substance(s) found: ${flagged.join(', ')}.`,
      source: 'mock-flagged-substance-list',
      checkedAt: now.toISOString(),
    };
  }

  return {
    status: 'match',
    reason: 'No flagged substances found in provided ingredient list.',
    source: 'mock-flagged-substance-list',
    checkedAt: now.toISOString(),
  };
}

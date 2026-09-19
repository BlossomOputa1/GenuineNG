import { checkExpiry } from './expiryChecker.js';
import { checkRegistration } from './registrationMatcher.js';
import { checkRecall } from './recallChecker.js';
import { checkIngredients } from './ingredientChecker.js';
import { datasetSummary } from './referenceData.js';

export function buildResult({
  productName,
  manufacturer,
  expiryDate,
  registrationNumber,
  batchNumber,
  ingredients,
}) {
  const now = new Date();

  const checks = {
    registration: checkRegistration(registrationNumber, productName, manufacturer, now),
    expiry: checkExpiry(expiryDate, now),
    recall: checkRecall(batchNumber, registrationNumber, now),
    ingredients: checkIngredients(ingredients, now),
  };

  return {
    status: 'completed',
    productName: productName || null,
    checks,
    summary: buildSummary(checks),
    checkedAt: now.toISOString(),
    dataset: datasetSummary(),
    limitation: 'Layer 1 checks printed information against available reference data. It does not prove what is inside a sealed pack or prove that packaging has not been copied.',
  };
}

function buildSummary(checks) {
  const statuses = Object.values(checks).map(check => check.status);
  return {
    hasWarning: statuses.includes('warning'),
    warningKeys: Object.entries(checks).filter(([, value]) => value.status === 'warning').map(([key]) => key),
    allNotChecked: statuses.every(status => status === 'not_checked'),
    matchedCount: statuses.filter(status => status === 'match').length,
    totalChecks: statuses.length,
  };
}

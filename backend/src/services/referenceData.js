import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../../../data/processed');

function readJson(name, fallback) {
  try {
    const raw = fs.readFileSync(path.join(dataDir, name), 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Could not load ${name}: ${error.message}`);
    return fallback;
  }
}

export const productReference = readJson('reference_products.json', {
  meta: { coverage: 'Reference data unavailable.' },
  products: []
});

export const recallReference = readJson('recalls.json', {
  meta: { coverage: 'Recall data unavailable.' },
  recalls: []
});

export const flaggedSubstances = readJson('flagged_substances.json', {
  meta: { coverage: 'Flagged-substance data unavailable.' },
  rules: []
});

export function datasetSummary() {
  return {
    productRecords: productReference.products.length,
    productCheckedAt: productReference.meta?.checkedAt || null,
    productCoverage: productReference.meta?.coverage || null,
    recallRecords: recallReference.recalls.length,
    recallCheckedAt: recallReference.meta?.checkedAt || null,
    ingredientRules: flaggedSubstances.rules.length,
    ingredientCheckedAt: flaggedSubstances.meta?.checkedAt || null,
  };
}

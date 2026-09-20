import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATASET_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'nafdac_greenbook_export.json'
);

let dataset = { generatedAt: null, records: [] };

try {
  const raw = fs.readFileSync(DATASET_PATH, 'utf-8');
  dataset = JSON.parse(raw);
  console.log(
    `Loaded ${dataset.records.length} reference records (generated ${dataset.generatedAt})`
  );
} catch (err) {
  console.warn(
    'Reference dataset not found or invalid — registration checks will return unverified for everything. Run scripts/fetch-nafdac-greenbook.js.'
  );
}

export function findByRegistrationNumber(registrationNumber) {
  return (
    dataset.records.find((r) => r.registrationNumber === registrationNumber) ||
    null
  );
}

export function getDatasetInfo() {
  return {
    generatedAt: dataset.generatedAt,
    recordCount: dataset.records.length,
  };
}

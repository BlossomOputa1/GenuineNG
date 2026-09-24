import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATASET_PATHS = [
  path.resolve(__dirname, '../../../nafdac_greenbook_export.json'),
  path.resolve(__dirname, '../../../data/processed/reference_products.json'),
  path.resolve(__dirname, '../../data/processed/reference_products.json'),
];

let dataset = { generatedAt: null, records: [] };

for (const datasetPath of DATASET_PATHS) {
  try {
    const raw = fs.readFileSync(datasetPath, 'utf-8');
    const candidate = JSON.parse(raw);
    const candidateRecords = Array.isArray(candidate?.records)
      ? candidate.records
      : Array.isArray(candidate?.products)
        ? candidate.products
        : null;
    if (!candidateRecords) throw new Error('Dataset must contain records or products.');
    dataset = {
      generatedAt: candidate.generatedAt || candidate.meta?.checkedAt || null,
      records: candidateRecords
        .filter((record) => record && typeof record.registrationNumber === 'string')
        .map((record) => ({
          ...record,
          manufacturer: record.manufacturer || record.manufacturerName || null,
        })),
    };
    console.log(
      `Loaded ${dataset.records.length} reference records from ${datasetPath} (generated ${dataset.generatedAt})`
    );
    break;
  } catch (err) {
    console.warn(`Reference dataset candidate unavailable: ${datasetPath} (${err.message})`);
  }
}

if (dataset.records.length === 0) {
  console.error(
    `Reference dataset not found or invalid. Tried: ${DATASET_PATHS.join(', ')}. Registration checks will return unverified.`
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

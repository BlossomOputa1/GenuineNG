import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATASET_PATHS = [
  path.resolve(__dirname, '../../../nafdac_greenbook_export.json'),
];

let dataset = { generatedAt: null, records: [] };
let registrationIndex = new Map();

function normalizeRegistration(value = '') {
  return String(value).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

for (const datasetPath of DATASET_PATHS) {
  try {
    const raw = fs.readFileSync(datasetPath, 'utf-8');
    const candidate = JSON.parse(raw);
    const candidateRecords = Array.isArray(candidate?.records) ? candidate.records : null;
    if (!candidateRecords) throw new Error('Dataset must contain records.');
    dataset = {
      generatedAt: candidate.generatedAt || null,
      records: candidateRecords
        .filter((record) => record && typeof record.registrationNumber === 'string')
        .map((record) => ({
          registrationNumber: record.registrationNumber,
          productName: record.productName || null,
          manufacturer: record.manufacturer || null,
          category: record.category || null,
          status: record.status || null,
          approvalDate: record.approvalDate || null,
          expiryDate: record.expiryDate || null,
        })),
    };
    registrationIndex = new Map();
    for (const record of dataset.records) {
      const key = normalizeRegistration(record.registrationNumber);
      if (key && !registrationIndex.has(key)) registrationIndex.set(key, record);
    }
    console.log(`Loaded ${dataset.records.length} NAFDAC reference records (generated ${dataset.generatedAt}).`);
    break;
  } catch (err) {
    console.warn(`Reference dataset unavailable: ${datasetPath} (${err.message})`);
  }
}

if (dataset.records.length === 0) {
  console.error('NAFDAC reference dataset is unavailable. Registration checks will return unverified.');
}

export function findByRegistrationNumber(registrationNumber) {
  const key = normalizeRegistration(registrationNumber);
  return key ? registrationIndex.get(key) || null : null;
}

export function getDatasetInfo() {
  return {
    generatedAt: dataset.generatedAt,
    recordCount: dataset.records.length,
  };
}

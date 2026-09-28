import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(here, '..', 'nafdac_greenbook_export.json');
const document = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const records = Array.isArray(document.records) ? document.records : [];
const errors = [];
const seen = new Map();
let blankRegistrations = 0;
let duplicateRegistrations = 0;

for (const [index, row] of records.entries()) {
  const label = `Record ${index + 1}`;
  const registration = String(row.registrationNumber || '').trim();
  const productName = String(row.productName || '').trim();
  if (!productName) errors.push(`${label}: productName is required.`);
  if (!registration) {
    blankRegistrations += 1;
    continue;
  }
  const key = registration.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (seen.has(key)) duplicateRegistrations += 1;
  else seen.set(key, index + 1);
}

if (!records.length) errors.push('Reference dataset contains no records.');
if (errors.length) {
  console.error(`Reference data validation failed (${errors.length} structural issue${errors.length === 1 ? '' : 's'}).`);
  errors.slice(0, 30).forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`Reference data valid: ${records.length} records.`);
console.log(`Usable unique registration keys: ${seen.size}; source duplicates: ${duplicateRegistrations}; blank registration rows ignored: ${blankRegistrations}.`);

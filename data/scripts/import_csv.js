#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2];
const outputPath = process.argv[3] || path.resolve(__dirname, '../processed/reference_products.json');

if (!inputPath) {
  console.error('Usage: node data/scripts/import_csv.js <reviewed-products.csv> [output.json]');
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') { field += '"'; i += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === ',' && !quoted) { row.push(field); field = ''; continue; }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(field); field = '';
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      continue;
    }
    field += char;
  }
  if (field.length || row.length) { row.push(field); if (row.some(value => value.trim())) rows.push(row); }
  return rows;
}

const raw = fs.readFileSync(path.resolve(inputPath), 'utf8');
const rows = parseCsv(raw);
if (rows.length < 2) throw new Error('CSV must include a header row and at least one product.');
const headers = rows[0].map(value => value.trim());
const required = ['productName', 'registrationNumber', 'manufacturer', 'sourceUrl', 'checkedAt'];
const missing = required.filter(name => !headers.includes(name));
if (missing.length) throw new Error(`Missing required CSV columns: ${missing.join(', ')}`);

const products = rows.slice(1).map((values, index) => {
  const item = Object.fromEntries(headers.map((key, column) => [key, (values[column] || '').trim()]));
  if (!item.productName || !item.registrationNumber || !item.sourceUrl || !item.checkedAt) {
    throw new Error(`Row ${index + 2} is missing a required value.`);
  }
  return {
    productName: item.productName,
    registrationNumber: item.registrationNumber,
    manufacturer: item.manufacturer || '',
    category: item.category || '',
    status: item.status || 'reviewed',
    sourceUrl: item.sourceUrl,
    checkedAt: item.checkedAt,
  };
});

const output = {
  meta: {
    name: 'GenuineNG reviewed Layer 1 reference import',
    checkedAt: new Date().toISOString().slice(0, 10),
    coverage: 'Only records present in this reviewed import are covered. Absence is not evidence that a product is fake or unsafe.',
    primarySource: 'Reviewed source URLs stored per record',
  },
  products,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Imported ${products.length} reviewed products -> ${outputPath}`);

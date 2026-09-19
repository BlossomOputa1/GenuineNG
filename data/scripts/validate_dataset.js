#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(process.argv[2] || path.resolve(__dirname, '../processed/reference_products.json'));
const document = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const products = Array.isArray(document.products) ? document.products : [];
const errors = [];
const seen = new Map();

function normalizedRegistration(value = '') { return String(value).toUpperCase().replace(/[^A-Z0-9]/g, ''); }

products.forEach((product, index) => {
  const row = index + 1;
  for (const field of ['productName', 'registrationNumber', 'sourceUrl']) {
    if (!String(product[field] || '').trim()) errors.push(`Record ${row}: ${field} is required.`);
  }
  const key = normalizedRegistration(product.registrationNumber);
  if (key) {
    if (seen.has(key)) errors.push(`Records ${seen.get(key)} and ${row}: duplicate registration number ${product.registrationNumber}.`);
    seen.set(key, row);
  }
  if (product.checkedAt && !/^\d{4}-\d{2}-\d{2}$/.test(product.checkedAt)) errors.push(`Record ${row}: checkedAt must use YYYY-MM-DD.`);
});

if (!products.length) errors.push('Dataset contains no products.');
if (errors.length) {
  console.error(`Dataset validation failed (${errors.length} issue${errors.length === 1 ? '' : 's'}):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`Dataset is structurally valid: ${products.length} products, ${seen.size} unique registration numbers.`);

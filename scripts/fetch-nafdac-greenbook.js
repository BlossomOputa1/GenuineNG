import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'https://greenbook.nafdac.gov.ng/';
const PAGE_SIZE = 500;
const OUTPUT_FILE = path.join(__dirname, '..', 'nafdac_greenbook_export.json');

function buildColumns() {
  const columns = [
    ['product_name', true],
    ['ingredient.ingredient_name', true],
    ['product_category.name', false],
    ['product_category_id', true],
    ['ingredient.synonym', true],
    ['NAFDAC', true],
    ['form.name', true],
    ['route.name', true],
    ['strength', true],
    ['applicant.name', true],
    ['approval_date', true],
    ['status', true],
  ];
  const params = new URLSearchParams();
  columns.forEach(([data, orderable], i) => {
    params.set(`columns[${i}][data]`, data);
    params.set(`columns[${i}][name]`, data);
    params.set(`columns[${i}][searchable]`, 'true');
    params.set(`columns[${i}][orderable]`, String(orderable));
    params.set(`columns[${i}][search][value]`, '');
    params.set(`columns[${i}][search][regex]`, 'false');
  });
  return params;
}

async function fetchPage(cookies, start, draw) {
  const params = buildColumns();
  params.set('order[0][column]', '0');
  params.set('order[0][dir]', 'asc');
  params.set('start', String(start));
  params.set('length', String(PAGE_SIZE));
  params.set('search[value]', '');
  params.set('search[regex]', 'false');
  params.set('search_ingredient', '');
  params.set('draw', String(draw));
  params.set('_', String(Date.now()));

  const res = await fetch(`${BASE_URL}?${params.toString()}`, {
    headers: {
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      Cookie: cookies,
      Referer: BASE_URL,
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function getCookies() {
  const res = await fetch(BASE_URL);
  const raw = res.headers.getSetCookie?.() || [res.headers.get('set-cookie')];
  return raw.map((c) => c.split(';')[0]).join('; ');
}

async function main() {
  console.log('Fetching session cookies...');
  const cookies = await getCookies();

  console.log('Fetching first page...');
  const first = await fetchPage(cookies, 0, 1);
  const total = first.recordsTotal;
  console.log(`Total records available: ${total}`);

  let allRecords = [...first.data];
  let draw = 2;

  for (let start = PAGE_SIZE; start < total; start += PAGE_SIZE) {
    console.log(`Fetching ${start}-${start + PAGE_SIZE} of ${total}...`);
    const page = await fetchPage(cookies, start, draw++);
    allRecords = allRecords.concat(page.data);
    await new Promise((r) => setTimeout(r, 300)); // be polite, don't hammer the server
  }

  const cleaned = allRecords.map((r) => ({
    registrationNumber: r.NAFDAC?.trim() || null,
    productName: r.product_name || null,
    manufacturer: r.applicant?.name || null,
    category: r.product_category?.name || null,
    status: r.status || null,
    approvalDate: r.approval_date || null,
    expiryDate: r.expiry_date || null,
  }));

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'nafdac-greenbook-export',
    recordCount: cleaned.length,
    records: cleaned,
  };

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(
    `Saved ${cleaned.length} records to ${OUTPUT_FILE}, generated at ${output.generatedAt}`
  );
}

main().catch(console.error);

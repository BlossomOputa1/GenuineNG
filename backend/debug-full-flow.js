import fs from 'node:fs';

const FRONT_PATH =
  'c:/Users/Danni/Desktop/Hackathon/WhatsApp Image 2026-09-21 at 5.23.36 PM.jpeg';
const BACK_PATH =
  'c:/Users/Danni/Desktop/Hackathon/WhatsApp Image 2026-09-21 at 5.23.53 PM.jpeg';
const BASE_URL = 'http://localhost:4000';

async function main() {
  // Step 1 — extract fields from the photos
  const form = new FormData();
  if (fs.existsSync(FRONT_PATH)) {
    form.append(
      'front',
      new Blob([fs.readFileSync(FRONT_PATH)], { type: 'image/jpeg' }),
      'front.jpg'
    );
  }
  if (fs.existsSync(BACK_PATH)) {
    form.append(
      'back',
      new Blob([fs.readFileSync(BACK_PATH)], { type: 'image/jpeg' }),
      'back.jpg'
    );
  }

  console.log('--- Step 1: Extracting fields from photos ---');
  const extractRes = await fetch(`${BASE_URL}/api/extract-label`, {
    method: 'POST',
    body: form,
  });
  const extractData = await extractRes.json();
  console.log('Status:', extractRes.status);
  console.log(JSON.stringify(extractData, null, 2));

  if (extractData.status !== 'completed') {
    console.log(
      '\nExtraction did not complete — stopping before verification step.'
    );
    return;
  }

  // Step 2 — run the extracted fields through the real verification check
  console.log(
    '\n--- Step 2: Verifying extracted fields against NAFDAC Greenbook dataset ---'
  );
  const checkRes = await fetch(`${BASE_URL}/api/label-checks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(extractData.fields),
  });
  const checkData = await checkRes.json();
  console.log('Status:', checkRes.status);
  console.log(JSON.stringify(checkData, null, 2));
}

main().catch(console.error);

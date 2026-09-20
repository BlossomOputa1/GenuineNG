import fs from 'node:fs';

const FRONT_PATH =
  'c:/Users/Danni/Desktop/Hackathon/WhatsApp Image 2026-09-20 at 9.35.24 AM.jpeg';
const BACK_PATH =
  'c:/Users/Danni/Desktop/Hackathon/WhatsApp Image 2026-09-20 at 11.50.02 AM.jpeg';
const BACKEND_URL = 'http://localhost:4000/api/extract-label';

async function main() {
  const form = new FormData();

  if (fs.existsSync(FRONT_PATH)) {
    const frontBuffer = fs.readFileSync(FRONT_PATH);
    form.append(
      'front',
      new Blob([frontBuffer], { type: 'image/jpeg' }),
      'front.jpg'
    );
  }

  if (fs.existsSync(BACK_PATH)) {
    const backBuffer = fs.readFileSync(BACK_PATH);
    form.append(
      'back',
      new Blob([backBuffer], { type: 'image/jpeg' }),
      'back.jpg'
    );
  }

  const res = await fetch(BACKEND_URL, { method: 'POST', body: form });
  const data = await res.json();
  console.log('Status:', res.status);
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);

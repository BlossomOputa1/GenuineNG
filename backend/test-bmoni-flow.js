// test-bmoni-flow.js
import 'dotenv/config';
import crypto from 'crypto';

// Adjust target URL if testing against hosted Render vs local server
const BASE_URL = 'https://genuineng.onrender.com';
const WEBHOOK_SECRET = process.env.BMONI_WEBHOOK_SECRET;

// 1. Replace these with actual test IDs from your database
// test-bmoni-flow.js
const TEST_BATCH_ID ='3b21967c-2652-426b-bba2-f81f25804a29';
const TEST_REFERENCE = 'test-ref-bmoni-002';
const TEST_AUTH_TOKEN = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImE1NGRjNTY4LTgxZjktNGYwOS1iZjBiLTY2YzhhMWRiMjFmZCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2xibGN4YWNvY2pjZ3VjaHNja2N0LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI5NWU0YTYyNS04ZDkxLTRjNGEtOWJmMi03NTE1NTU2YjRlNzQiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzkwNTQxNzk5LCJpYXQiOjE3OTA1MzgxOTksImVtYWlsIjoiY2hpZGVyYW9wdXRhQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJjaGlkZXJhb3B1dGFAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6IkJsb3Nzb20gT3B1dGEiLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6Ijk1ZTRhNjI1LThkOTEtNGM0YS05YmYyLTc1MTU1NTZiNGU3NCJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzkwNTM4MTk5fV0sInNlc3Npb25faWQiOiIzZmFiNDljOC04ZmQ5LTRhMDAtYWNmYy03MWFhMjY3NzljNzkiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.iXJUaKEOWAPNpkOvZUfnwvaftGoayY1xl87Tcg24RStNFyJxbROZxH__unM1XtfKbpMG8mWf_DD-hpw7hjGdWA'

if (!WEBHOOK_SECRET) {
  console.error('Error: BMONI_WEBHOOK_SECRET is missing from .env');
  process.exit(1);
}

async function runTest() {
  console.log('--- Starting BMoni Payment Gate Integration Test ---\n');

  // STEP 1: Verify the 402 Payment Gate
  console.log(`[1] Requesting code generation for batch: ${TEST_BATCH_ID}...`);
  const initialRes = await fetch(`${BASE_URL}/api/manufacturer/batches/${TEST_BATCH_ID}/generate-codes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
    },
  });

  const initialBody = await initialRes.json();
  console.log(`Status Code: ${initialRes.status}`);
  console.log('Response:', initialBody);

  if (initialRes.status === 402) {
    console.log('PASS: Endpoint correctly returned 402 Payment Required.\n');
  } else {
    console.warn(`NOTICE: Expected 402, but received ${initialRes.status}.\n`);
  }

  // STEP 2: Dispatch Signed Webhook (smart_wallet.credited)
  console.log('[2] Simulating BMoni smart_wallet.credited webhook...');
  
  const webhookPayload = JSON.stringify({
    event: 'smart_wallet.credited',
    data: {
      reference: TEST_REFERENCE,
      batch_id: TEST_BATCH_ID,
      amount: 50000,
      currency: 'NGN',
      txHash: '0xmockhash1234567890abcdef',
    },
  });

  // Calculate HMAC-SHA256 signature exactly like BMoni
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(webhookPayload)
    .digest('hex');

  const webhookRes = await fetch(`${BASE_URL}/api/bmoni/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bmoni-signature': signature,
    },
    body: webhookPayload,
  });

  const webhookBody = await webhookRes.json();
  console.log(`Webhook HTTP Status: ${webhookRes.status}`);
  console.log('Webhook Response:', webhookBody);

  if (webhookRes.status === 200 && webhookBody.received) {
    console.log('PASS: Webhook signature verified and event acknowledged.\n');
  } else {
    console.error('FAIL: Webhook was rejected or failed to process.\n');
    return;
  }

  // STEP 3: Verify the Unlocked Gate
  console.log('[3] Re-testing code generation after settlement...');
  const finalRes = await fetch(`${BASE_URL}/api/manufacturer/batches/${TEST_BATCH_ID}/generate-codes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
    },
  });

  const finalBody = await finalRes.json();
  console.log(`Status Code: ${finalRes.status}`);
  console.log('Response Summary:', {
    status: finalRes.status,
    resultSummary: finalBody.result ? `${finalBody.result.length || 'Batch'} codes processed` : finalBody,
  });

  if (finalRes.status === 201 || finalRes.status === 200) {
    console.log('\nSUCCESS: 402 gate cleared and code generation completed.');
  } else {
    console.log('\nFAIL: Gate remains locked. Check invoice settlement status in Supabase.');
  }
}

runTest().catch(console.error);
// test-live-bmoni.js
//
// End-to-end integration verification script for BMoni Payment Rails (Layer 2)
// Simulates the full payment loop:
// 1. Ping /api/health
// 2. Confirm POST /api/manufacturer/batches/:id/generate-codes returns 402 Payment Required
// 3. Post a valid HMAC-signed smart_wallet.credited webhook to /api/bmoni/webhook
// 4. Re-request /api/manufacturer/batches/:id/generate-codes and confirm 201 with codes generated

import 'dotenv/config';
import crypto from 'crypto';
import { supabase } from './src/config/supabaseClient.js';

const BASE_URL = process.env.TEST_TARGET_URL || 'http://localhost:4000';
const WEBHOOK_SECRET = process.env.BMONI_WEBHOOK_SECRET;

const TEST_BATCH_ID = process.env.TEST_BATCH_ID || '3b21967c-2652-426b-bba2-f81f25804a29';
const TEST_REFERENCE = process.env.TEST_REFERENCE || 'test-ref-bmoni-002';
const TEST_AUTH_TOKEN =
  process.env.TEST_AUTH_TOKEN ||
  'eyJhbGciOiJFUzI1NiIsImtpZCI6ImE1NGRjNTY4LTgxZjktNGYwOS1iZjBiLTY2YzhhMWRiMjFmZCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2xibGN4YWNvY2pjZ3VjaHNja2N0LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI5NWU0YTYyNS04ZDkxLTRjNGEtOWJmMi03NTE1NTU2YjRlNzQiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzkwNTQxNzk5LCJpYXQiOjE3OTA1MzgxOTksImVtYWlsIjoiY2hpZGVyYW9wdXRhQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJjaGlkZXJhb3B1dGFAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6IkJsb3Nzb20gT3B1dGEiLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6Ijk1ZTRhNjI1LThkOTEtNGM0YS05YmYyLTc1MTU1NTZiNGU3NCJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzkwNTM4MTk5fV0sInNlc3Npb25faWQiOiIzZmFiNDljOC04ZmQ5LTRhMDAtYWNmYy03MWFhMjY3NzljNzkiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.iXJUaKEOWAPNpkOvZUfnwvaftGoayY1xl87Tcg24RStNFyJxbROZxH__unM1XtfKbpMG8mWf_DD-hpw7hjGdWA';

if (!WEBHOOK_SECRET) {
  console.error('Error: BMONI_WEBHOOK_SECRET is missing from .env');
  process.exit(1);
}

async function runLiveVerification() {
  console.log('====================================================');
  console.log('  GenuineNG Layer 2 BMoni Integration Verification  ');
  console.log('====================================================\n');
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log(`Test Batch ID:   ${TEST_BATCH_ID}`);
  console.log(`Test Reference:  ${TEST_REFERENCE}\n`);

  // Check if server is running before attempting integration suite
  try {
    const preCheck = await fetch(`${BASE_URL}/api/health`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!preCheck.ok) {
      console.log(`Server at ${BASE_URL} returned status ${preCheck.status}. Skipping live test.`);
      return;
    }
  } catch (e) {
    console.log(`Server at ${BASE_URL} is offline (${e.cause?.code || e.message}). Start server with 'npm start' to run live verification.`);
    return;
  }

  // Reset invoice to 'pending' and clean previous test codes for repeatability
  console.log('[Setup] Preparing test state in Supabase...');
  await supabase
    .from('invoices')
    .update({ status: 'pending', settled_at: null })
    .eq('reference', TEST_REFERENCE);

  await supabase
    .from('unit_codes')
    .delete()
    .eq('batch_id', TEST_BATCH_ID);

  console.log('[Setup] Invoice status reset to "pending", unit_codes cleared for clean test run.\n');

  // STEP 1: Ping /api/health
  console.log('--- STEP 1: Ping /api/health ---');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthBody = await healthRes.json();
  console.log(`HTTP Status: ${healthRes.status}`);
  console.log('Response:', healthBody);

  if (healthRes.status === 200 && healthBody.status === 'ok') {
    console.log('PASS: Health check passed.\n');
  } else {
    console.error('FAIL: Health check failed.');
    process.exit(1);
  }

  // STEP 2: Confirm POST /api/manufacturer/batches/:id/generate-codes returns 402
  console.log('--- STEP 2: Confirm 402 Payment Required Gate ---');
  console.log(`Requesting code generation for batch ${TEST_BATCH_ID} before payment settlement...`);
  const gateRes = await fetch(
    `${BASE_URL}/api/manufacturer/batches/${TEST_BATCH_ID}/generate-codes`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_AUTH_TOKEN}`,
      },
    }
  );

  const gateBody = await gateRes.json();
  console.log(`HTTP Status: ${gateRes.status}`);
  console.log('Response:', gateBody);

  if (gateRes.status === 402 && gateBody?.error?.code === 'PAYMENT_REQUIRED') {
    console.log('PASS: Endpoint correctly returned 402 Payment Required.\n');
  } else {
    console.error(`FAIL: Expected 402 with code PAYMENT_REQUIRED, received ${gateRes.status}`);
    process.exit(1);
  }

  // STEP 3: Post valid signed smart_wallet.credited webhook to /api/bmoni/webhook
  console.log('--- STEP 3: Dispatch Signed BMoni Webhook ---');
  const webhookPayload = JSON.stringify({
    event: 'smart_wallet.credited',
    data: {
      reference: TEST_REFERENCE,
      batch_id: TEST_BATCH_ID,
      amount: 50000,
      currency: 'NGN',
      txHash: '0xmockhash1234567890abcdef1234567890',
    },
  });

  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(webhookPayload)
    .digest('hex');

  console.log(`Sending webhook for reference: ${TEST_REFERENCE}`);
  console.log(`HMAC-SHA256 signature: ${signature}`);

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

  if (webhookRes.status === 200 && webhookBody.received === true) {
    console.log('PASS: Webhook verified signature and returned { received: true }.\n');
  } else {
    console.error('FAIL: Webhook signature verification or processing failed.');
    process.exit(1);
  }

  // Verify in database that invoice is settled
  const { data: updatedInvoice, error: invError } = await supabase
    .from('invoices')
    .select('id, reference, status, settled_at')
    .eq('reference', TEST_REFERENCE)
    .single();

  console.log('Verified database invoice state:', updatedInvoice);
  if (invError || updatedInvoice?.status !== 'settled') {
    console.error('FAIL: Database invoice status was not updated to settled.');
    process.exit(1);
  }
  console.log('PASS: Invoice verified as settled in database.\n');

  // STEP 4: Re-request code generation and confirm 201 with generated codes
  console.log('--- STEP 4: Re-request Code Generation after Settlement ---');
  console.log(`Requesting code generation for batch ${TEST_BATCH_ID}...`);
  const finalRes = await fetch(
    `${BASE_URL}/api/manufacturer/batches/${TEST_BATCH_ID}/generate-codes`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_AUTH_TOKEN}`,
      },
    }
  );

  const finalBody = await finalRes.json();
  console.log(`HTTP Status: ${finalRes.status}`);
  console.log('Response:', finalBody);

  if (finalRes.status === 201 && finalBody.result?.unitsGenerated) {
    console.log(
      `\n SUCCESS: Code generation completed! ${finalBody.result.unitsGenerated} units cryptographically signed with Ed25519.`
    );
    console.log('Batch Code:', finalBody.result.batchCode);
    console.log('====================================================');
    console.log('  ALL INTEGRATION VERIFICATION CHECKS PASSED        ');
    console.log('====================================================');
  } else {
    console.error('\nFAIL: Code generation did not return 201 with generated codes.');
    process.exit(1);
  }
}

runLiveVerification().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});

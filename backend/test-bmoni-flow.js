// test-bmoni-flow.js
import 'dotenv/config';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4000';
const WEBHOOK_SECRET = process.env.BMONI_WEBHOOK_SECRET;

const TEST_BATCH_ID = '3b21967c-2652-426b-bba2-f81f25804a29';
const TEST_REFERENCE = 'test-ref-bmoni-002';

const TEST_EMAIL = process.env.TEST_MANUFACTURER_EMAIL || 'chideraoputa@gmail.com';
const TEST_PASSWORD = process.env.TEST_MANUFACTURER_PASSWORD;

if (!WEBHOOK_SECRET) {
  console.error('Error: BMONI_WEBHOOK_SECRET is missing from .env');
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
  console.error('Error: SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY is missing from .env');
  process.exit(1);
}

if (!TEST_PASSWORD) {
  console.error('Error: TEST_MANUFACTURER_PASSWORD is required in .env for dynamic authentication.');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY
);

// Optional admin client to auto-reset test state if service role key is present
const supabaseAdmin = process.env.SUPABASE_SECRET_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)
  : null;

async function getFreshSessionToken() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (error || !data.session) {
    throw new Error(`Authentication failed for ${TEST_EMAIL}: ${error?.message}`);
  }

  return data.session.access_token;
}

async function resetTestInvoice() {
  if (!supabaseAdmin) return;
  console.log('[Setup] Resetting test invoice to pending status...');
  const { data: mfg } = await supabaseAdmin
    .from('manufacturers')
    .select('id')
    .eq('business_email', TEST_EMAIL)
    .maybeSingle();

  if (mfg?.id) {
    let { data: product } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('manufacturer_id', mfg.id)
      .maybeSingle();

    if (!product) {
      const { data: newProd } = await supabaseAdmin
        .from('products')
        .insert({
          manufacturer_id: mfg.id,
          name: 'BMoni Test Product',
          category: 'Pharmaceutical',
          nafdac_number: 'B4-0001',
        })
        .select()
        .single();
      product = newProd;
    }

    const { data: existingBatch } = await supabaseAdmin
      .from('batches')
      .select('id')
      .eq('id', TEST_BATCH_ID)
      .maybeSingle();

    if (!existingBatch && product) {
      await supabaseAdmin.from('batches').insert({
        id: TEST_BATCH_ID,
        product_id: product.id,
        batch_code: 'BMONI-TEST-01',
        manufactured_date: '2026-01-01',
        expiry_date: '2029-01-01',
        units_produced: 100,
      });
    }

    await supabaseAdmin
      .from('unit_codes')
      .delete()
      .eq('batch_id', TEST_BATCH_ID);

    await supabaseAdmin
      .from('invoices')
      .update({
        status: 'pending',
        settled_at: null,
        manufacturer_id: mfg.id,
        batch_id: TEST_BATCH_ID,
      })
      .eq('reference', TEST_REFERENCE);
  }
}

async function runTest() {
  console.log('--- Starting BMoni Payment Gate Integration Test ---\n');
  console.log(`Target Base URL: ${BASE_URL}`);

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

  await resetTestInvoice();

  console.log(`[0] Logging in as ${TEST_EMAIL} to fetch fresh token...`);
  const authToken = await getFreshSessionToken();
  console.log('PASS: Fresh JWT session acquired.\n');

  // STEP 1: Verify the 402 Payment Gate
  console.log(`[1] Requesting code generation for batch: ${TEST_BATCH_ID}...`);
  const initialRes = await fetch(`${BASE_URL}/api/manufacturer/batches/${TEST_BATCH_ID}/generate-codes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ chunkSize: 100 }),
  });

  const initialBody = await initialRes.json();
  console.log(`Status Code: ${initialRes.status}`);
  console.log('Response:', initialBody);

  if (initialRes.status === 402) {
    console.log('PASS: Endpoint correctly returned 402 Payment Required.\n');
  } else {
    console.error(`FAIL: Expected 402, received ${initialRes.status}.\n`);
    if (initialRes.status === 401 || initialRes.status === 403) {
      console.error('Check whether your test user profile is approved in the manufacturers table.');
      return;
    }
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

  // Calculate HMAC-SHA256 signature against the raw string
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
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ chunkSize: 100 }),
  });

  const finalBody = await finalRes.json();
  console.log(`Status Code: ${finalRes.status}`);
  console.log('Response Summary:', finalBody);

  if (finalRes.status === 200 || finalRes.status === 201 || finalRes.status === 202) {
    console.log('\nSUCCESS: 402 gate cleared and code generation completed.');
  } else {
    console.error('\nFAIL: Gate remains locked. Inspect invoices row in Supabase.');
  }
}

runTest().catch(console.error);
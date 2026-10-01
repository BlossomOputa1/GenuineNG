// backend/test-full-system-e2e.js
// Comprehensive End-to-End System Verification for GenuineNG
// Tests Layer 1 (Registry Label Check) and Layer 2 (Ed25519 QR, 402 Gate, HMAC Webhook, 3-Scan Anti-Reuse)

import 'dotenv/config';
import crypto from 'crypto';
import { supabase as supabaseAdmin } from './src/config/supabaseClient.js';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.TEST_TARGET_URL || 'http://localhost:4000';
const WEBHOOK_SECRET = process.env.BMONI_WEBHOOK_SECRET;
const TEST_EMAIL = process.env.TEST_MANUFACTURER_EMAIL || 'chideraoputa@gmail.com';
const TEST_PASSWORD = process.env.TEST_MANUFACTURER_PASSWORD;

async function runE2E() {
  console.log('====================================================');
  console.log('  GenuineNG Full System Architecture Verification   ');
  console.log('====================================================\n');

  // --- STEP 1: Backend Health Check ---
  console.log('[STEP 1] Testing /api/health...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthData = await healthRes.json();
  if (healthRes.status !== 200 || healthData.status !== 'ok') {
    throw new Error(`Health check failed: ${JSON.stringify(healthData)}`);
  }
  console.log('  ✅ Backend is online and healthy.\n');

  // --- STEP 2: Layer 1 Label Check ---
  console.log('[STEP 2] Testing Layer 1: POST /api/label-checks...');
  const labelCheckRes = await fetch(`${BASE_URL}/api/label-checks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productName: 'Amoxicillin 500mg',
      manufacturer: 'Emzor Pharmaceuticals Ltd',
      registrationNumber: '04-1234',
      expiryDate: '2028-12-31',
    }),
  });
  const labelCheckData = await labelCheckRes.json();
  if (labelCheckRes.status !== 200 || !labelCheckData.checks) {
    throw new Error(`Layer 1 label check failed: ${JSON.stringify(labelCheckData)}`);
  }
  console.log('  ✅ Layer 1 check response received:');
  console.log('     Registration check status:', labelCheckData.checks.registration?.status);
  console.log('     Expiry check status:      ', labelCheckData.checks.expiry?.status);
  console.log('     Overall verdict:          ', labelCheckData.verdict?.title, '\n');

  // --- STEP 3: Setup Approved Manufacturer Profile ---
  console.log('[STEP 3] Setting up test manufacturer account in Supabase...');
  const clientAuth = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY
  );

  const { data: authData, error: authError } = await clientAuth.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (authError || !authData.session) {
    throw new Error(`Auth sign-in failed for ${TEST_EMAIL}: ${authError?.message}`);
  }
  const userId = authData.user.id;
  const token = authData.session.access_token;
  console.log(`  ✅ Authenticated as ${TEST_EMAIL} (user_id: ${userId}).`);

  // Ensure manufacturer row exists and is approved
  const { data: mfgRecord, error: mfgUpsertError } = await supabaseAdmin
    .from('manufacturers')
    .upsert({
      user_id: userId,
      company_name: 'Test Pharma Industries PLC',
      business_email: TEST_EMAIL,
      approved: true,
      approved_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('id, company_name, approved')
    .single();

  if (mfgUpsertError) {
    throw new Error(`Failed to upsert manufacturer profile: ${mfgUpsertError.message}`);
  }
  const manufacturerId = mfgRecord.id;
  console.log(`  ✅ Manufacturer profile ready (id: ${manufacturerId}, approved: ${mfgRecord.approved}).\n`);

  // --- STEP 4: Manufacturer Product & Batch Creation ---
  console.log('[STEP 4] Testing Manufacturer Portal Product & Batch creation...');
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Create product
  const prodRes = await fetch(`${BASE_URL}/api/manufacturer/products`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: `E2E Test Amoxil-${Date.now()}`,
      category: 'Pharmaceutical',
      nafdacNumber: 'B4-9988',
    }),
  });
  const prodData = await prodRes.json();
  if (prodRes.status !== 201 || !prodData.product?.id) {
    throw new Error(`Product creation failed: ${JSON.stringify(prodData)}`);
  }
  const productId = prodData.product.id;
  console.log(`  ✅ Product registered (id: ${productId}, name: ${prodData.product.name}).`);

  // Create batch
  const testBatchCode = `E2E-BATCH-${Date.now().toString().slice(-6)}`;
  const batchRes = await fetch(`${BASE_URL}/api/manufacturer/batches`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      productId,
      batchCode: testBatchCode,
      manufacturedDate: '2026-01-01',
      expiryDate: '2029-01-01',
      unitsProduced: 10,
    }),
  });
  const batchData = await batchRes.json();
  if (batchRes.status !== 201 || !batchData.batch?.id) {
    throw new Error(`Batch creation failed: ${JSON.stringify(batchData)}`);
  }
  const batchId = batchData.batch.id;
  console.log(`  ✅ Batch created (id: ${batchId}, batchCode: ${testBatchCode}, units: 10).\n`);

  // --- STEP 5: BMoni 402 Gate Enforcement ---
  console.log('[STEP 5] Testing BMoni 402 Payment Required Gate on code generation...');
  const gateRes = await fetch(`${BASE_URL}/api/manufacturer/batches/${batchId}/generate-codes`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ chunkSize: 10 }),
  });
  const gateData = await gateRes.json();
  if (gateRes.status !== 402 || gateData?.error?.code !== 'PAYMENT_REQUIRED') {
    throw new Error(`Expected 402 PAYMENT_REQUIRED, received ${gateRes.status}: ${JSON.stringify(gateData)}`);
  }
  console.log('  ✅ 402 Payment Required correctly enforced on unbilled/unsettled batch.\n');

  // --- STEP 6: Insert Pending Invoice and Dispatch HMAC Webhook ---
  console.log('[STEP 6] Testing BMoni Webhook Settlement via HMAC-SHA256 signature...');
  const testRef = `e2e-ref-${Date.now()}`;
  const { data: invoiceRecord, error: invError } = await supabaseAdmin
    .from('invoices')
    .insert({
      manufacturer_id: manufacturerId,
      batch_id: batchId,
      reference: testRef,
      amount: 15000,
      currency: 'NGN',
      status: 'pending',
    })
    .select('id, reference, status')
    .single();

  if (invError) throw new Error(`Failed to create test invoice: ${invError.message}`);
  console.log(`  ✅ Pending invoice recorded in DB (id: ${invoiceRecord.id}, ref: ${testRef}).`);

  // Dispatch smart_wallet.credited webhook with valid HMAC
  const webhookPayload = JSON.stringify({
    event: 'smart_wallet.credited',
    data: {
      reference: testRef,
      batch_id: batchId,
      amount: 15000,
      currency: 'NGN',
      txHash: '0xmock_e2e_tx_hash_1234567890',
    },
  });

  const webhookSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(webhookPayload)
    .digest('hex');

  const webhookRes = await fetch(`${BASE_URL}/api/bmoni/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bmoni-signature': webhookSignature,
    },
    body: webhookPayload,
  });
  const webhookData = await webhookRes.json();
  if (webhookRes.status !== 200 || !webhookData.received) {
    throw new Error(`Webhook failed: ${JSON.stringify(webhookData)}`);
  }
  console.log('  ✅ Webhook verified signature and returned { received: true }.');

  // Confirm invoice is settled in Supabase
  const { data: settledInv } = await supabaseAdmin
    .from('invoices')
    .select('id, status, settled_at')
    .eq('id', invoiceRecord.id)
    .single();

  if (settledInv?.status !== 'settled') {
    throw new Error(`Invoice status was not updated to settled. Got: ${settledInv?.status}`);
  }
  console.log('  ✅ Invoice verified as "settled" in database.\n');

  // --- STEP 7: Unlocked Code Generation ---
  console.log('[STEP 7] Generating cryptographic unit codes after settlement...');
  const genRes = await fetch(`${BASE_URL}/api/manufacturer/batches/${batchId}/generate-codes`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ chunkSize: 10 }),
  });
  const genData = await genRes.json();
  if ((genRes.status !== 200 && genRes.status !== 201) || !genData.result?.complete) {
    throw new Error(`Code generation failed: ${JSON.stringify(genData)}`);
  }
  console.log(`  ✅ Code generation completed: ${genData.result.generated}/${genData.result.total} units signed.\n`);

  // --- STEP 8: Verification of Ed25519 Signed QR Code ---
  console.log('[STEP 8] Querying an issued unit code and testing /api/verify-code...');
  const { data: unitRecord, error: unitError } = await supabaseAdmin
    .from('unit_codes')
    .select('unit_id, payload, signature, status, public_scan_count')
    .eq('batch_id', batchId)
    .eq('unit_index', 1)
    .single();

  if (unitError || !unitRecord) throw new Error(`Could not find unit_codes row: ${unitError?.message}`);
  console.log(`  Target Unit ID: ${unitRecord.unit_id}`);

  // Scan #1: First public scan
  console.log('  [Scan 1] Verifying public scan #1...');
  const scan1Res = await fetch(`${BASE_URL}/api/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: unitRecord.payload, signature: unitRecord.signature }),
  });
  const scan1Data = await scan1Res.json();
  if (scan1Data.verdict !== 'genuine' || scan1Data.reuseStatus !== 'first_scan' || scan1Data.publicScanNumber !== 1) {
    throw new Error(`Scan #1 failed: ${JSON.stringify(scan1Data)}`);
  }
  console.log('  ✅ Scan #1 PASS: verdict=genuine, reuseStatus=first_scan, count=1');

  // Scan #2: Second public scan
  console.log('  [Scan 2] Verifying public scan #2...');
  const scan2Res = await fetch(`${BASE_URL}/api/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: unitRecord.payload, signature: unitRecord.signature }),
  });
  const scan2Data = await scan2Res.json();
  if (scan2Data.verdict !== 'genuine' || scan2Data.reuseStatus !== 'previously_scanned' || scan2Data.publicScanNumber !== 2) {
    throw new Error(`Scan #2 failed: ${JSON.stringify(scan2Data)}`);
  }
  console.log('  ✅ Scan #2 PASS: verdict=genuine, reuseStatus=previously_scanned, count=2');

  // Scan #3: Third public scan (limit reached, unit revoked)
  console.log('  [Scan 3] Verifying public scan #3 (limit reached)...');
  const scan3Res = await fetch(`${BASE_URL}/api/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: unitRecord.payload, signature: unitRecord.signature }),
  });
  const scan3Data = await scan3Res.json();
  if (scan3Data.verdict !== 'genuine' || scan3Data.reuseStatus !== 'reuse_limit_reached' || scan3Data.publicScanNumber !== 3 || scan3Data.unitStatus !== 'revoked') {
    throw new Error(`Scan #3 failed: ${JSON.stringify(scan3Data)}`);
  }
  console.log('  ✅ Scan #3 PASS: verdict=genuine, reuseStatus=reuse_limit_reached, unitStatus=revoked');

  // Scan #4: Fourth public scan (already revoked -> NOT GENUINE)
  console.log('  [Scan 4] Verifying public scan #4 (post-revocation)...');
  const scan4Res = await fetch(`${BASE_URL}/api/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: unitRecord.payload, signature: unitRecord.signature }),
  });
  const scan4Data = await scan4Res.json();
  if (scan4Data.verdict !== 'not_genuine' || scan4Data.reuseStatus !== 'revoked' || scan4Data.publicScanNumber !== 4) {
    throw new Error(`Scan #4 failed: ${JSON.stringify(scan4Data)}`);
  }
  console.log('  ✅ Scan #4 PASS: verdict=not_genuine, reuseStatus=revoked, unit deactivated for future scans.\n');

  // --- STEP 9: Tampering Test ---
  console.log('[STEP 9] Testing forged signature rejection...');
  const forgedRes = await fetch(`${BASE_URL}/api/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payload: unitRecord.payload,
      signature: 'MC4CAQAwBQYDK2VwBCIEIDy6fhSswzRzZuQmlqAcmfAPYcXgFYENsvS7EdhoiPcD==',
    }),
  });
  const forgedData = await forgedRes.json();
  if (forgedData.verdict !== 'not_genuine') {
    throw new Error(`Forged signature was not rejected: ${JSON.stringify(forgedData)}`);
  }
  console.log('  ✅ Forged signature correctly returned verdict: not_genuine.\n');

  // --- Cleanup ---
  console.log('[Cleanup] Cleaning up test records from database...');
  await supabaseAdmin.from('invoices').delete().eq('id', invoiceRecord.id);
  await supabaseAdmin.from('unit_codes').delete().eq('batch_id', batchId);
  await supabaseAdmin.from('batches').delete().eq('id', batchId);
  await supabaseAdmin.from('products').delete().eq('id', productId);
  console.log('  ✅ Test records cleaned up.\n');

  console.log('====================================================');
  console.log('  ALL END-TO-END SYSTEM INTEGRATION TESTS PASSED!   ');
  console.log('====================================================');
}

runE2E().catch((err) => {
  console.error('\n❌ E2E VERIFICATION FAILED:', err);
  process.exit(1);
});

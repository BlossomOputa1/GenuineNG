// backend/src/services/bmoniService.js
import { supabase as supabaseAdmin } from '../config/supabaseClient.js';

const BMONI_BASE_URL = (
  process.env.BMONI_BASE_URL ||
  process.env.BMONI_API_URL ||
  'https://embedded-dev.bmoni.com'
).replace(/\/+$/, '');

/**
 * Creates or fetches a dynamic Virtual Bank Account (Smart Wallet) via BMoni.
 */
export async function createBatchSmartWallet({ manufacturerId, batchId, amount }) {
  const apiKey = process.env.BMONI_API_KEY || process.env.BMONI_SECRET_KEY;
  if (!apiKey) {
    throw new Error('BMONI_API_KEY is not configured on the server.');
  }

  // Ensure /api prefix is present per BMoni specs
  const endpoint = BMONI_BASE_URL.endsWith('/api')
    ? `${BMONI_BASE_URL}/v1/smart-wallets`
    : `${BMONI_BASE_URL}/api/v1/smart-wallets`;

  const payload = {
    customer_id: manufacturerId,
    currency: 'NGN',
    metadata: {
      batch_id: batchId,
      amount,
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const resBody = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg =
      resBody?.message ||
      resBody?.error ||
      `BMoni request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.statusCode = 502;
    err.code = 'BMONI_VBA_FAILED';
    throw err;
  }

  const walletData = resBody.data || resBody;

  // Persist or update the pending invoice record
  const reference = walletData.reference || `inv_${Date.now()}`;
  const { data: invoice, error: invoiceErr } = await supabaseAdmin
    .from('invoices')
    .upsert(
      {
        manufacturer_id: manufacturerId,
        batch_id: batchId,
        reference,
        amount,
        currency: 'NGN',
        status: 'pending',
      },
      { onConflict: 'reference' }
    )
    .select()
    .single();

  if (invoiceErr) {
    console.error('Failed to record invoice for VBA:', invoiceErr);
  }

  return {
    reference,
    account_number: walletData.account_number || walletData.accountNumber,
    bank_name: walletData.bank_name || walletData.bankName || 'Wema Bank',
    account_name: walletData.account_name || walletData.accountName || 'GenuineNG / BMoni',
    amount,
    currency: 'NGN',
  };
}
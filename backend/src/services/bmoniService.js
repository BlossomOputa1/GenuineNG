import { randomUUID } from 'node:crypto';
import { supabase as admin } from '../config/supabaseClient.js';
import { assertSandboxReady, getSandboxDepositAccount, sandboxBillingEnabled } from './bmoniClient.js';

export const PRICE_PER_CODE_NGN = 5;

function fail(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  throw error;
}

function publicInvoice(row) {
  return {
    id: row.id, reference: row.reference, tokenQuantity: row.token_quantity,
    amount: Number(row.amount), currency: row.currency, status: row.status,
    bankName: row.bank_name, accountName: row.account_name,
    accountNumber: row.account_number, createdAt: row.created_at, settledAt: row.settled_at,
  };
}

export async function getTokenAccount(manufacturerId) {
  assertSandboxReady();
  const { data, error } = await admin.from('manufacturer_token_accounts')
    .select('balance').eq('manufacturer_id', manufacturerId).maybeSingle();
  if (error) throw error;
  return { balance: Number(data?.balance || 0), pricePerToken: PRICE_PER_CODE_NGN };
}

export async function createTokenInvoice(manufacturerId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) {
    fail('Choose between 1 and 100,000 tokens.', 400, 'INVALID_TOKEN_QUANTITY');
  }
  const account = await getSandboxDepositAccount();
  const { data, error } = await admin.from('invoices').insert({
    manufacturer_id: manufacturerId, batch_id: null,
    billing_context: 'bmoni_tokens', token_quantity: quantity,
    reference: `GNG-TKN-${randomUUID()}`, amount: quantity * PRICE_PER_CODE_NGN,
    currency: 'NGN', status: 'pending', bank_name: account.bankName,
    account_name: account.accountName, account_number: account.accountNumber,
  }).select('*').single();
  if (error) throw error;
  return publicInvoice(data);
}

export async function listInvoices(manufacturerId) {
  const { data, error } = await admin.from('invoices').select('*')
    .eq('manufacturer_id', manufacturerId).eq('billing_context', 'bmoni_tokens')
    .order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data.map(publicInvoice);
}

export async function getTokenInvoice(manufacturerId, invoiceId) {
  const { data, error } = await admin.from('invoices').select('*')
    .eq('id', invoiceId).eq('manufacturer_id', manufacturerId)
    .eq('billing_context', 'bmoni_tokens').maybeSingle();
  if (error) throw error;
  if (!data) fail('Token invoice not found.', 404, 'INVOICE_NOT_FOUND');
  return publicInvoice(data);
}

export async function reserveBatchTokens(manufacturerId, batchId) {
  assertSandboxReady();
  const { data, error } = await admin.rpc('reserve_genuineng_batch_tokens', {
    p_manufacturer_id: manufacturerId, p_batch_id: batchId,
  });
  if (error) throw error;
  if (!data?.reserved) {
    fail('Not enough tokens for this batch. Buy tokens in Payments first.', 402, 'TOKENS_REQUIRED');
  }
  return data;
}

export async function settleInvoiceFromWebhook({ reference, amount, currency, accountNumber, transactionId, eventId }) {
  if (!sandboxBillingEnabled() || !reference || !/^\d+(?:\.\d{1,2})?$/.test(String(amount)) ||
      currency !== 'NGN' || !/^\d{10}$/.test(String(accountNumber || '')) ||
      !transactionId || !eventId) return false;
  const { data, error } = await admin.rpc('settle_bmoni_sandbox_invoice', {
    p_reference: reference, p_amount: String(amount), p_currency: currency,
    p_account_number: String(accountNumber), p_transaction_id: String(transactionId),
    p_event_id: String(eventId),
  });
  if (error) throw error;
  return data === true;
}

import express from 'express';
import crypto from 'crypto';
import { supabase as supabaseAdmin } from '../config/supabaseClient.js';

const router = express.Router();

/**
 * Validates BMoni's HMAC-SHA256 signature against the raw request buffer.
 */
function verifyBmoniSignature(rawBody, signatureHeader, secret) {
  if (!rawBody || !signatureHeader || !secret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const cleanSignature = signatureHeader.replace(/^sha256=/, '');

  try {
    const sigBuf = Buffer.from(cleanSignature, 'hex');
    const expBuf = Buffer.from(expectedSignature, 'hex');
    if (sigBuf.length !== expBuf.length || sigBuf.length === 0) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

/**
 * POST /api/bmoni/webhook
 * Receives asynchronous transaction updates from BMoni rails.
 */
router.post('/webhook', async (req, res) => {
  const signature =
    req.headers['x-bmoni-signature'] || req.headers['bmoni-signature'];

  // 1. Authenticate that BMoni sent this request
  const isValid = verifyBmoniSignature(
    req.rawBody,
    signature,
    process.env.BMONI_WEBHOOK_SECRET
  );

  if (!isValid) {
    console.warn('[BMoni Webhook] Signature verification failed.');
    return res.status(401).json({ error: 'Invalid webhook signature.' });
  }

  const { event, data = {} } = req.body || {};
  console.log(`[BMoni Webhook] Received event: ${event}`);

  try {
    switch (event) {
      // Inbound rail: Manufacturer funded their dedicated Virtual Bank Account
      case 'smart_wallet.credited': {
        const { reference, amount, currency, txHash } = data;

        // Settle the invoice in Supabase
        const { data: invoice, error } = await supabaseAdmin
          .from('invoices')
          .update({
            status: 'settled',
            settled_at: new Date().toISOString(),
          })
          .eq('reference', reference)
          .select('id, batch_id, manufacturer_id')
          .maybeSingle();

        if (error || !invoice) {
          console.error(
            `[BMoni Webhook] Failed to settle invoice for reference: ${reference}`,
            error
          );
        } else {
          console.log(
            `[BMoni Webhook] Invoice ${invoice.id} settled. Batch ${invoice.batch_id} unlocked.`
          );
        }
        break;
      }

      // Outbound rail: Bounty payout completed to reporter's bank
      case 'proposal.executed':
      case 'withdrawal.completed': {
        const { proposalId, status } = data;
        console.log(`[BMoni Webhook] Bounty payout ${proposalId} status: ${status}`);

        // Update bounty payout status in reports table
        await supabaseAdmin
          .from('counterfeit_reports')
          .update({ bounty_status: 'paid', bounty_paid_at: new Date().toISOString() })
          .eq('bmoni_proposal_id', proposalId);
        break;
      }

      default:
        console.log(`[BMoni Webhook] Unhandled event: ${event}`);
    }

    // Always acknowledge quickly with 200 OK so BMoni does not retry
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[BMoni Webhook Error]:', err);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }
});

export default router;
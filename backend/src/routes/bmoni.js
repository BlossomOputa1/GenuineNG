import express from 'express';
import crypto from 'node:crypto';
import { assertSandboxReady } from '../services/bmoniClient.js';
import { settleInvoiceFromWebhook } from '../services/bmoniService.js';

const router = express.Router();

export function verifyBmoniSignature(raw, signature, secret) {
  if (!Buffer.isBuffer(raw) || !secret || !/^[a-f0-9]{64}$/i.test(signature || '')) return false;
  const expected = crypto.createHmac('sha256', secret).update(raw).digest();
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), expected);
}

router.post('/webhook', express.raw({ type: 'application/json', limit: '32kb' }), async (req, res) => {
  try {
    assertSandboxReady();
  } catch {
    return res.sendStatus(503);
  }
  if (!verifyBmoniSignature(req.body, req.get('X-Webhook-Signature'), process.env.BMONI_WEBHOOK_SECRET)) {
    return res.sendStatus(401);
  }
  let event;
  try { event = JSON.parse(req.body.toString('utf8')); }
  catch { return res.sendStatus(400); }
  if (!event?.id || req.get('X-Webhook-Id') !== event.id) return res.sendStatus(400);
  if (event.eventType !== 'employee.deposit.completed') return res.sendStatus(200);

  const payload = event.payload || {};
  // BMONI's public example names only userId and amount. Fields below must be
  // confirmed in a real signed sandbox delivery. Missing data never unlocks codes.
  const settlement = {
    eventId: event.id,
    reference: payload.reference || payload.invoiceReference,
    amount: payload.amount,
    currency: payload.currency,
    accountNumber: payload.accountNumber || payload.depositAccountNumber,
    transactionId: payload.transactionId || payload.transaction?.id,
  };
  try {
    const matched = await settleInvoiceFromWebhook(settlement);
    if (!matched) console.warn('Unmatched BMONI sandbox deposit event:', event.id);
    return res.status(200).json({ received: true, matched });
  } catch (error) {
    console.error('BMONI sandbox settlement failed:', event.id, error);
    return res.sendStatus(500);
  }
});

export default router;

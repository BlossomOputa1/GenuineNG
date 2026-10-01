# BMoni Embedded Payment Rail Integration: Architecture & Flow

This document details the architecture, compliance model, and operational lifecycle of the **BMoni Embedded Rails** integrated into **GenuineNG**. It outlines how fiat-to-smart-wallet settlement powers cryptographic batch code issuance for manufacturers without requiring them to install consumer mobile applications.

---

## 1. Executive Summary & Philosophy

GenuineNG provides anti-counterfeit product verification using unique Ed25519 digital signatures embedded into QR codes and packaging manifests. Code generation requires funding per production unit.

Rather than handling manual bank receipts or exposing direct commercial accounts, GenuineNG uses **BMoni Embedded Financial Infrastructure** to provide dynamic, programmatic payment rails:

* **No-App Web Flow:** The manufacturer interacts entirely through the GenuineNG web platform. All BMoni provisioning and settlement verification happen server-to-server.
* **Dedicated Virtual Bank Accounts (VBAs):** Every batch funding request generates a dedicated 10-digit NUBAN (e.g., Wema Bank / Providus Bank) paired to an invoice reference.
* **Instant Stablecoin Settlement:** Deposits cleared through Nigerian banking rails are programmatically credited to the underlying smart wallet rail as cNGN (stable Naira).
* **Automated Cryptographic Unlocking:** HMAC-signed webhooks trigger instant ledger updates in Supabase, unblocking the Ed25519 signing engine automatically.

---

## 2. End-to-End Architectural Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                         MANUFACTURER CLIENT                          │
│                      (genuine-ng.vercel.app)                         │
└──────────────────────────────────┬───────────────────────────────────┘
     1. Request Code Generation    │    2. HTTP 402 Payment Required
        (e.g., 5,000 units)        │       Triggers Funding Modal
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        GENUINENG API BACKEND                         │
│                       (genuineng.onrender.com)                       │
└───────────┬─────────────────────────────────────────────▲────────────┘
            │                                             │
   3. Create User / Request VBA                 8. Realtime / Polling:
   4. Return Dedicated NUBAN + Reference           Invoice Settled
            │                                             │
            ▼                                             │
┌───────────────────────────────┐             ┌───────────┴────────────┐
│        BMONI EMBEDDED         │             │    SUPABASE DATABASE   │
│    (embedded-dev.bmoni.com)   │             │      (PostgreSQL)      │
└───────────────┬───────────────┘             └───────────▲────────────┘
                │                                         │
      5. Provisions NUBAN                     7. Mark Invoice 'settled'
                ▼                                         │
┌───────────────────────────────┐                         │
│     PARTNER CLEARING BANK     │                         │
│     (Wema / Providus Bank)    │                         │
└───────────────┬───────────────┘                         │
                │                                         │
      6. Manufacturer sends ₦                             │
         via any bank (GTB, Kuda, OPay)                   │
                ▼                                         │
┌──────────────────────────────────────────────────────────────────────┐
│                       BMONI WEBHOOK DISPATCHER                       │
│             POST /api/bmoni/webhook (HMAC-SHA256 Signed)             │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Integration Lifecycle Stages

### Stage 1: The 402 Enforcement Gate

1. The manufacturer navigates to `/manufacturer/generate-codes` and selects a production batch.
2. The frontend triggers `POST /api/manufacturer/batches/:id/generate-codes`.
3. The backend inspects the batch billing status. If unbilled, the server returns an explicit **HTTP 402 Payment Required** response:

```json
{
  "error": {
    "code": "PAYMENT_REQUIRED",
    "message": "Payment required before generating batch codes.",
    "invoiceStatus": "unbilled"
  }
}
```

### Stage 2: Dynamic Rail Allocation (VBA Generation)

1. The client intercepts the 402 status and calls `POST /api/manufacturer/vba` with the target batch ID and total fee (calculated as units × unit price).
2. The GenuineNG server registers the manufacturer entity and requests a dedicated Virtual Bank Account:
   * **In Sandbox/Test Mode:** Generates a deterministic testing virtual account with an isolated reference.
   * **In Production Mode:** Calls BMoni's `/v1/users/{userId}/smart-wallets/{walletId}/onramp/vba/nigeria` to receive a live dynamic 10-digit NUBAN.
3. A pending invoice is created in the database:

```sql
INSERT INTO public.invoices (manufacturer_id, batch_id, reference, amount, currency, status)
VALUES ('m_123', 'b_456', 'bmoni_ref_172764...', 50000, 'NGN', 'pending');
```

### Stage 3: Funding Presentation

1. The `BmoniPaymentModal` displays on the client interface:
   * **Bank Name:** Wema Bank
   * **Account Number:** 10-Digit NUBAN (with one-click clipboard copy)
   * **Amount to Fund:** Formatted in NGN (e.g., `₦50,000 NGN`)
   * **Reference Identifier:** Matches the database invoice entry
   * **Countdown Window:** Active 15-minute expiration timer
2. Manufacturers can transfer funds from **any Nigerian commercial or mobile banking application** (Access, GTBank, Kuda, OPay, Moniepoint). No BMoni consumer app registration is required.

### Stage 4: Settlement & Webhook Verification

1. Once funds are transferred, the clearing bank routes the fiat to BMoni's collection pool.
2. BMoni mints/credits the equivalent stable Naira (cNGN) into the assigned smart wallet rail.
3. BMoni sends a signed webhook event to GenuineNG:
   * **URL:** `POST https://genuineng.onrender.com/api/bmoni/webhook`
   * **Header:** `x-bmoni-signature: <HMAC_SHA256_HEX>`
   * **Body:**

   ```json
   {
     "event": "smart_wallet.credited",
     "data": {
       "reference": "bmoni_ref_172764...",
       "amount": 50000,
       "currency": "NGN",
       "txHash": "0x4f8b2..."
     }
   }
   ```

4. The GenuineNG webhook handler validates the signature using `BMONI_WEBHOOK_SECRET`:

```javascript
const computedSignature = crypto
  .createHmac('sha256', process.env.BMONI_WEBHOOK_SECRET)
  .update(rawBody)
  .digest('hex');

if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature))) {
  return res.status(401).json({ error: 'Invalid webhook signature.' });
}
```

5. Upon successful validation, the invoice status is marked as `settled` in Supabase.

### Stage 5: Reactive Code Issuance

1. Supabase Realtime notifies the open `GenerateCodesPage` browser tab of the invoice update (`postgres_changes` event on `invoices`).
2. The modal displays a green **"Payment Settled! Invoice Confirmed"** checkmark and closes after 1.5 seconds.
3. The page initiates `generateCodes()`:
   * The backend signs each physical unit sequentially using Ed25519 private keys.
   * Progress increments in real-time from `0%` to `100%`.
   * Export artifacts (CSV, Print Manifests, QR ZIP archives) are generated and unlocked.

---

## 4. Key Security & Compliance Considerations

* **Server-Side Key Isolation:** The Ed25519 signing keys and BMoni API credentials reside strictly on the server (Render environment) and are never exposed to the browser.
* **Timing-Safe Validation:** Webhook signatures are checked using `crypto.timingSafeEqual` to eliminate timing-attack vulnerabilities during HMAC verification.
* **Deterministic Invoice Matching:** Every payment request carries a unique `reference` identifier, preventing transaction collisions across concurrent manufacturer operations.

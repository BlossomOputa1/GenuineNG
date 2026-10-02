# BMONI sandbox tokens and single-use product codes

One GenuineNG QR costs one token. In this sandbox build, each token is ₦5. Manufacturers buy tokens from the dedicated Payments page. GenuineNG credits the token balance only after an exact signed BMONI deposit matches an invoice, then reserves the batch's unit count once when code generation begins. Consumers scan for free.

## Setup

1. Apply `supabase/migrations/011_create_invoices.sql` if needed, then `012_bmoni_sandbox_billing.sql`, then `013_tokens_and_single_use.sql`. Existing `011` invoices remain as legacy records. Already issued batches are grandfathered when resumed; historical paid batch invoices are not automatically converted to token credits. Review those manually in the sandbox.
2. In the backend server environment set `BMONI_ENV=sandbox`, `BMONI_BASE_URL=https://embedded-dev.bmoni.com`, `BMONI_API_KEY`, `BMONI_WEBHOOK_SECRET`, and `BMONI_USER_ID` for the sandbox user who owns the NGN deposit account. Keep all secrets out of frontend files. No production partner ID or signing private key is required for inbound deposits.
3. Configure the sandbox `employee.deposit.completed` webhook to `https://YOUR_BACKEND/api/bmoni/webhook`. Use the webhook configuration's secret as `BMONI_WEBHOOK_SECRET`. If registration requires a partner ID, use the sandbox one. Only after migrations and sandbox setup, set `BMONI_BILLING_ENABLED=true` and restart the backend.
4. Open manufacturer Payments, buy a test quantity, and check the invoice details. After a matching webhook the balance rises by that quantity. Generate Codes reserves the full unit count once for a new batch; retrying a partial generation does not deduct tokens again. The dashboard and Payments page show the remaining balance.

## Webhook contract to check with BMONI

A signed sandbox deposit event must include the invoice `reference`, exact NGN `amount`, destination `accountNumber`, and unique `transactionId` in its payload (or the explicit aliases in `backend/src/routes/bmoni.js`). BMONI's public webhook example shows only `userId` and `amount`. An event missing a field is acknowledged but cannot credit tokens; its ID is logged for investigation. The browser's Check payment status action reads the invoice only. Never infer the invoice from an amount sent to a shared bank account. No real funds should be used in sandbox tests.

## Single-use check

The first valid scan atomically marks its individual code `used`. Another scan says Already scanned. The shared cryptographic signing key remains valid for all other units. Existing codes with prior public scans become used when migration 013 runs. Scan Activity counts verification events by batch, without public/manufacturer/reuse/revoked subdivisions.

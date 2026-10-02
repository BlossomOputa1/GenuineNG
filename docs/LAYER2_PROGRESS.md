# GenuineNG — Layer 2 Progress

**Status as of this document:** all six manufacturer/customer backend routes from the Layer 2 plan are built and tested end to end against real data. Frontend work (mode-select screen, scan page, Manufacturer Portal UI) has not started.

This extends the completed Layer 1 codebase (free label verification — registration + expiry checks). Layer 2 adds a second, cryptographic verification path: manufacturers register products/batches, the server signs one unique QR per physical unit, and customers scan codes to get a signature verdict + reuse check — two separate outcomes, never blended, same philosophy as Layer 1's per-check status model.

Full flow diagrams, wording examples, and the original file structure plan live in `GenuineNG_Layer2_Plan.pdf`. This document tracks what's actually been built and the real decisions made along the way — read this first if the PDF and the code seem to disagree; the PDF was the starting plan, this reflects what actually happened.

---

## What's done and tested

| Piece                                               | What it does                                                                                                      | Tested                                                                                                  |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `005`–`008` migrations                              | `manufacturers`, `products`, `batches`, `unit_codes`, `verification_events` tables, with RLS added table-by-table | Applied                                                                                                 |
| `manufacturerAuthMiddleware.js`                     | Confirms the authenticated user is an approved manufacturer, attaches `req.manufacturer`                          | ✅ Unapproved / approved / no-profile cases                                                             |
| `POST /api/manufacturer/products`                   | Registers a product under the caller's manufacturer account                                                       | ✅ Happy path, validation, no-auth, not-approved                                                        |
| `POST /api/manufacturer/batches`                    | Creates a batch under a product the caller owns                                                                   | ✅ Happy path, duplicate `batch_code` (409), validation, ownership mismatch (404)                       |
| `keyManager.js` / `signer.js` / `qrGenerator.js`    | Ed25519 key loading, signing, QR PNG generation                                                                   | ✅ Sign/verify round-trip, QR scan-and-decode with a real phone                                         |
| `POST /api/manufacturer/batches/:id/generate-codes` | Signs and bulk-inserts one `unit_codes` row per unit                                                              | ✅ 500-unit batch, chunked inserts, idempotency guard (409 on repeat), verified against real table data |
| `POST /api/verify-code`                             | Public, unauthenticated. Verifies signature + issuance, logs a verification event                                 | ✅ Genuine, reuse detection, tampered signature, nonexistent unit                                       |
| `GET /api/manufacturer/scan-activity`               | Aggregates scan/unit counts per batch                                                                             | ✅ Verified against real data (500 units, 13 logged events, correct genuine/not-genuine split)          |
| `GET /api/manufacturer/batches/:id/export`          | Streams a ZIP: CSV, print manifest, and one QR PNG per unit                                                       | ✅ 500-unit export verified — real ZIP opened, PNGs confirmed valid                                     |

| `GET /api/manufacturer/products` | Lists a manufacturer's products with aggregate stats (batch count, codes issued, scans) | ✅ Verified against real data |
| `GET /api/manufacturer/batches` | Lists a manufacturer's batches with codes-generated count and status | ✅ Verified against real data (matches `scan-activity` totals) |
| `011_create_invoices.sql` | `invoices` table with reference unique, RLS, status ('pending', 'settled', 'cancelled') | ✅ Migration created, verified against Supabase |
| `bmoniClient.js` / `bmoniSigner.js` | Axios instance + secp256k1 proposal digest signing (`signProposalDigest`) | ✅ Verified signature format and signer address |
| `POST /api/manufacturer/vba` | Requests dynamic Nigerian VBA from BMoni, creates pending invoice | ✅ Authenticated & profile-linked |
| 402 Gate on `generate-codes` | Enforces invoice settlement before Ed25519 batch code generation | ✅ Verified: returns 402 when pending/missing, unlocks to 201 when settled |
| `POST /api/bmoni/webhook` | Verifies HMAC-SHA256 over raw buffer (`req.rawBody`), settles invoice | ✅ Verified with timing-safe HMAC check and live test suite |
| `test-live-bmoni.js` | Full end-to-end integration test (health -> 402 gate -> signed webhook -> 201 code gen) | ✅ All 4 steps passing end-to-end |

## Frontend UI mockup review (2026-09-23)

Gerald shared a manufacturer-portal UI mockup (Overview, Products, Batches, Generate Codes, Scan Activity, Team, Settings screens). Design-wise it's solid — clean dark theme, correct restraint on reuse-check language ("Signals only, not counterfeit verdicts"), honest placeholders on Team/Settings (no backend exists for either yet). Gaps found against the actual backend, before wiring it up for real:

- **All numbers in the mockup were placeholder/mock data**, not live — this prompted building the two list endpoints above, which didn't exist yet (only `POST` existed for products/batches, no way to list-with-stats).
- **Batch status** ("Generated" / "Ready to generate") now has a real backing field (`status` on `GET /batches`) — computed as `codesGenerated >= unitsProduced`, deliberately just two states since `generate-codes` is all-or-nothing per batch (no partial-generation state can currently exist).
- **Export UI mismatch, still unresolved:** the mockup's Generate Codes page shows three separate downloads (CSV data, QR ZIP, Print manifest), each with its own download icon — but the backend's `GET /export` returns **one combined ZIP** containing all three. Needs a decision: either change the UI to one "Download production files" button, or split the backend into a `?format=` query param so each button fetches just its piece. Leaning toward one combined button (matches the plan's own wording, and the "boring, auditable" philosophy) but this is a UX call, not decided yet.
- **Team and Settings pages** have no backend at all — correctly shown as placeholders in the mockup, nothing to build against yet.

## What's next

- Wire the mockup's Overview/Products/Batches/Scan Activity pages to the now-existing real endpoints
- Resolve the export UI decision above before wiring Generate Codes' download buttons
- Mode-select screen, `Layer2ScanPage`, `SignatureResultCard` (customer-facing, not yet started)
- `frontend/src/crypto/verifySignature.js` — local, offline signature check on the customer's device, mirroring `signer.js`'s canonicalization exactly
- Team/Settings backend (manufacturer portal user permissions) — not started, no plan yet beyond the placeholder UI
- No other backend routes remain unbuilt from the original Layer 2 plan

---

## Architecture decisions worth knowing

### Layering (same rule as Layer 1)

Routes = HTTP wiring only. Controllers = translate request↔service. Services = business logic, independently testable, no `req`/`res`. Validators = format/required-field checks at the API boundary.

### `unit_id` format

`{batch_code}-{unit_index padded to 6 digits}`, e.g. `PEAK-20260922-A-000001`. Only collision-free because `batch_code` has a **global** unique constraint. `unit_id` alone is never a valid lookup for verification — `verify-code` always requires the full signed payload + signature, never a bare `unit_id`.

### RLS — added table-by-table, not batched at the end

Every new table has RLS enabled by default with zero policies — **silent empty results**, not open access. Bit us once on `manufacturers`, cost real debugging time. Decision: write a minimal `select`-scoped-to-owner policy immediately after each table's migration; `insert` policies added when the route that needs them is built.

Current RLS state:

- `manufacturers` — select (own row)
- `products` — select + insert (own manufacturer)
- `batches` — select + insert (own manufacturer, via product ownership chain)
- `unit_codes`, `verification_events` — select only. **No insert policy** — both writes go through a service-role client instead (see below).

### Why `unit_codes` and `verification_events` inserts bypass RLS

`generate-codes` inserts thousands of rows per request, and `manufacturerAuthMiddleware` already did the real authorization before the loop starts — re-checking per-row via RLS is redundant. `verify-code` is public and unauthenticated — there's no `auth.uid()` for a policy to key off at all. Both import `supabase` directly from `config/supabaseClient.js` (the service-role client already used by `authMiddleware.js` for token verification) rather than taking `req.supabase`. This is the one deliberate place the codebase steps outside the RLS-scoped `req.supabase` pattern — flagged in code comments wherever it happens.

### `batch_code` uniqueness conflicts are handled explicitly

Postgres `unique_violation` (`23505`) on `batches.batch_code` is caught and translated to `409 BATCH_CODE_TAKEN` — a realistic user error, not a server fault.

### `signer.js` — canonicalization is the single most load-bearing detail in the whole system

`buildPayload()` uses a **fixed key order** (`productId, batchId, unitId, unitIndex, keyVersion`). Never reorder these keys — every signature check depends on rebuilding the exact same shape.

**Real bug found and fixed during testing:** `verifySignature()` originally trusted the caller's `payload` object key order directly (`JSON.stringify(payload)` on whatever arrived). This broke real verification — Postgres's `jsonb` column does **not** preserve insertion key order on read (confirmed directly: a stored payload came back as `{"unitId": ..., "batchId": ..., "productId": ...}`, not the order it was signed in). Fixed by having `verifySignature()` rebuild the payload through `buildPayload()` from individual field **values**, never trusting the caller's object shape. This is required, not optional — without it, genuine codes intermittently fail verification depending on how the payload happens to be serialized on the way in.

No timestamp is signed into the payload — `unit_codes.issued_at` covers that separately in the DB, since signature validity shouldn't depend on trusting a clock the verifier can't independently check.

### `verify-code` response design

Both "signature doesn't verify" and "unit not found in `unit_codes`" return the **identical** `not_genuine` response — same wording, `reuseCheck: "unavailable"` — deliberately, so a scanner can't distinguish "this code was tampered with" from "this ID never existed," which would otherwise leak information useful to an attacker.

### `reuseDetector.js` — deliberately simple, per the plan

Flags `possible_reuse` if a `unitId` has **any** prior `verification_events` row (genuine or not) at the time of the current scan, `no_unusual_activity` otherwise. Not advanced fraud detection by design. Note: failed/invalid verification attempts also count toward this — repeatedly probing one `unitId` with bad data will itself trigger `possible_reuse` on a later genuine scan, which is arguably correct (repeated probing is itself a signal) but worth knowing when reading test results.

### QR content contract

Each QR encodes `JSON.stringify({ payload, signature })`. This exact shape is the contract `frontend/src/crypto/verifySignature.js` must parse — not something to reinvent independently when that file gets built.

### Export route — streaming, and a real package-version gotcha

`GET /api/manufacturer/batches/:id/export` streams a ZIP directly to the response rather than buffering it in memory (matters at scale — thousands of units). Two things worth knowing if this route is ever touched again:

- **Errors after streaming has started don't produce a clean JSON error response** — headers are already sent by the time a mid-loop failure could occur, so Express can't send a fresh status code. Any hardening here would mean buffering the whole archive first, trading away the streaming benefit. Not fixed; documented as a known limitation.
- **`archiver`'s installed version uses a different API than most tutorials assume.** The version installed via plain `npm install archiver` exports `ZipArchive` as a **class** (`new ZipArchive({ zlib: { level: 9 } })`), not the older `archiver('zip', options)` factory function shown in most Stack Overflow answers and even archiver's own older README examples. Also required `createRequire` to import it at all, since it's CommonJS and doesn't resolve cleanly as a plain ESM default import under `"type": "module"` on this Node version. If this ever needs touching again, check the actual installed version's API before assuming either the old factory pattern or a plain default import will work.

### Env vars in use

| Variable                        | Where               | Notes                                                                |
| ------------------------------- | ------------------- | -------------------------------------------------------------------- |
| `GENUINENG_ED25519_PRIVATE_KEY` | Backend `.env` only | PKCS8 PEM, single physical line with `\n` escapes, never logged      |
| `GENUINENG_ED25519_PUBLIC_KEY`  | Backend `.env`      | SPKI PEM, same format                                                |
| `VITE_GENUINENG_PUBLIC_KEY`     | Frontend `.env`     | Same public key value, Vite-prefixed                                 |
| `GENUINENG_KEY_VERSION`         | Backend `.env`      | Currently `v1`; stored with every signed payload for future rotation |

**`.env` formatting gotcha:** multi-line PEM keys must be a single physical line, quoted, with real newlines replaced by literal `\n`. Splitting across actual lines breaks dotenv's parser silently — `keyManager.js` will fail fast with a clear error if this happens, which is how this was caught. The updated `generateKeyPair.js` script prints already-correctly-formatted `.env` lines to copy-paste directly.

**Security note:** the original keypair, Supabase secret key, and Gemini API key were briefly pasted in plaintext during a debugging session and were rotated immediately. Never paste secret values anywhere outside `.env` files — if it happens, rotate immediately rather than assuming it's fine. (A short-lived Supabase auth access token was also pasted during route testing at one point — lower risk since it self-expires in ~1 hour, but same principle: avoid it going forward.)

### Testing pattern used throughout

Every piece was tested in isolation before being wired into the next layer — throwaway scripts (deleted after use) proved `signer.js` and `qrGenerator.js` independently before `generate-codes` used them together. Every route was tested via Thunder Client against real Supabase test accounts, covering happy path, validation failure, auth failure, and the specific failure mode unique to that route. The `export` route couldn't be tested via Thunder Client at all (its free tier doesn't support binary responses) — tested instead via PowerShell's `Invoke-WebRequest -OutFile`, with the resulting ZIP opened and its contents manually verified.

A recurring lesson worth naming explicitly: several `verify-code` test failures during development turned out to be test-input mistakes (copying a placeholder value, pairing one unit's payload with a different unit's signature, confusing a row's own `id` with the `productId` field inside its `payload` jsonb) rather than code bugs — each failure was the system correctly rejecting a genuinely mismatched payload/signature pair. When a verification test fails, check the test input against the source row field-by-field before assuming the code is wrong.

---

## Testing manufacturer routes locally

1. Create a test Supabase Auth user (Authentication → Users)
2. Insert a matching row in `manufacturers` with `approved = false`, then flip to `true` + set `approved_at` once ready to test the happy path
3. Sign in via `POST {SUPABASE_URL}/auth/v1/token?grant_type=password` with `apikey` header + email/password body to get a bearer token
4. Use that token as `Authorization: Bearer <token>` against any `/api/manufacturer/*` route

For "no manufacturer profile" tests, use a second Auth user with no `manufacturers` row. For `verify-code`, no auth is needed at all — pull real `payload`/`signature` pairs from the `unit_codes` table, from the **same row**, expanded together to avoid mixing fields from different rows.

# GenuineNG — Layer 1 Backend

Verification Backend (label extraction + registration/expiry checks) and Accounts & Data Storage (Supabase-backed scan history). Node.js + Express.

## Prerequisites

- Node.js 20+ (built-in `fetch` and `node --test` are used, no extra test/HTTP libraries)
- A Supabase project (ask Gerald for access, or create your own for local dev — see `supabase/migrations/`)
- A free Gemini API key from https://aistudio.google.com/apikey

## Setup

1. Clone the repo and `cd backend`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the env template and fill in real values:

   ```bash
   cp ../.env.example .env
   ```

   You need:
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` — from your Supabase project's Settings → API
   - `GEMINI_API_KEY` — from Google AI Studio (free tier is enough for dev; used for both label extraction and registration identity cross-checking)

   **Never commit `.env`** — it's gitignored. `.env.example` (repo root) holds placeholders only.

4. Generate the NAFDAC reference dataset (required — the app won't have real registration data without this):

   ```bash
   npm run refresh-data
   ```

   This scrapes NAFDAC's public Greenbook site (~9,000 records, takes a minute or two) and writes `nafdac_greenbook_export.json` to the **repo root**. This file is gitignored — everyone runs this once locally, not shared via git. Re-run it any time you want fresher data; there's no automatic refresh by design (kept intentionally simple/predictable for a short hackathon timeline).

5. Run the dev server:
   ```bash
   npm run dev
   ```
   Confirm the startup log shows something like:
   ```
   Loaded 8977 reference records (generated <today's date>)
   GenuineNG Layer 1 backend running on port 4000
   ```
   If you see "Reference dataset not found," you skipped step 4.

## Running tests

```bash
npm test
```

Currently **15/15 passing**. Tests use dependency injection for the registration matcher (fake dataset lookup, fake Gemini response) — they run fully offline, no live API calls, no real dataset file required.

## API contract

### `POST /api/extract-label` — public, no auth required

Reads one or both photos of a product label and extracts structured fields via Gemini vision, so the frontend never needs its own OCR pipeline or its own copy of the Gemini API key.

Request: `multipart/form-data` with one or both of:

- `front` — image file (JPEG/PNG/WebP, max 8MB)
- `back` — image file (JPEG/PNG/WebP, max 8MB)

At least one is required. Results from both photos are merged, preferring whichever side actually read a value for each field.

Response:

```json
{
  "status": "completed",
  "fields": {
    "productName": "string or null",
    "manufacturer": "string or null",
    "registrationNumber": "string or null",
    "expiryDate": "YYYY-MM-DD or null"
  }
}
```

If extraction genuinely fails (bad image, Gemini unavailable), still returns `200` with `status: "extraction_unavailable"` and all fields `null` — never a crash, never a guessed value. The frontend should let the user fill fields in manually in that case, same as before.

Tested against real product photos — correctly distinguishes a manufacturer (e.g. "Beiersdorf Nivea Consumer Products Nigeria Limited") from a brand name printed larger on the pack (e.g. "Nivea"), and correctly returns `null` for fields not visible in either photo rather than guessing.

### `POST /api/label-checks` — public, no auth required

Runs the two Layer 1 checks: **registration** (product name + manufacturer + NAFDAC number, cross-referenced against the real dataset, with Gemini-assisted fuzzy identity matching) and **expiry** (pure date math). Recall and ingredient checks were cut from scope entirely.

Request:

```json
{
  "productName": "string, REQUIRED",
  "manufacturer": "string, REQUIRED",
  "registrationNumber": "string, REQUIRED",
  "expiryDate": "YYYY-MM-DD, optional"
}
```

Response: each check independently reports `status` (`match` / `warning` / `not_checked` / `unverified`), a human-readable `reason`, and where applicable `source` + `checkedAt`. Never a single blended yes/no.

Typical flow: call `/api/extract-label` first, let the user review/correct the returned `fields` in the UI, then submit those (possibly edited) fields here.

### `/api/scans` — requires auth (`Authorization: Bearer <supabase JWT>`)

Full CRUD for a signed-in user's private scan history: `GET /` (list), `GET /:id`, `POST /` (create — atomic insert of scan + its checks via a Postgres function), `DELETE /:id`. Row Level Security enforced and verified — a user can never read or delete another user's scans (tested directly with two real accounts, not assumed).

### `GET /api/health`

Simple liveness check, no auth.

## Known limitations (stated on purpose, not hidden)

- Registration data is only as current as the last `npm run refresh-data` run — a newly registered product may briefly show `unverified` until the next refresh.
- A registration match confirms the _brand/entry_ is real; it can't confirm the specific physical item is genuine (a cloned real NAFDAC number on a _different_ product is caught as `warning`, but a number cloned onto an identical-looking counterfeit of the _same_ product is not detectable from label data alone).
- Registration numbers printed on physical packaging sometimes use NAFDAC's legacy numbering format (e.g. `02-6769`) that differs from Greenbook's current format for the same product (e.g. `A4-6769`) — confirmed with a real product during testing. This is a genuine inconsistency in NAFDAC's own data, not something this system attempts to reconcile: fuzzy-matching or prefix-stripping registration numbers would undermine the check's reliability and could make it easier for an altered number to slip through as a false match. A product affected by this shows `unverified`, which is the honest, correct result given what can actually be verified — not a bug.
- Expiry check trusts whatever date extraction/manual entry provides — can't detect a tampered or reprinted date on the physical pack.
- NAFDAC's Greenbook has no official public API — `scripts/fetch-nafdac-greenbook.js` uses the site's own internal data endpoint. It could break if NAFDAC changes their site.
- Greenbook itself only covers Drugs, Vaccines/Biologics, Medical Devices, Veterinary, Herbals/Nutraceuticals, and Disinfectants — cosmetics and general consumer products (e.g. body lotion) are outside its scope entirely, so a genuinely legitimate cosmetic product will correctly show `unverified`, not because anything is wrong, but because that category isn't tracked by this data source at all.
- Gemini identity comparison (in `/api/label-checks`) fails closed: if the API is unavailable/errors, the registration check still reports the number match honestly, but says identity verification was unavailable rather than guessing.

## Project structure

```
backend/src/
├── routes/            # labelChecks.js, scans.js, extractLabel.js
├── controllers/       # labelChecksController.js, scansController.js, extractLabelController.js
├── services/          # registrationMatcher.js, expiryChecker.js, resultBuilder.js,
│                         geminiMatcher.js, referenceData.js, labelExtractor.js
├── middleware/         # authMiddleware.js, errorHandler.js
├── validators/         # labelInputValidator.js, scanInputValidator.js
└── config/             # supabaseClient.js

scripts/
└── fetch-nafdac-greenbook.js   # run via `npm run refresh-data` from backend/

supabase/migrations/     # run these in order in the Supabase SQL Editor
```

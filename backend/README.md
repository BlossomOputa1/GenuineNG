# GenuineNG — Layer 1 Backend

Layer 1 backend for temporary label-image extraction plus registration/expiry verification.

## Current responsibility

The backend now handles only the public Layer 1 verification pipeline:

1. `POST /api/extract-label` — temporarily receives label photos in memory and uses Gemini Vision to extract four fields.
2. `POST /api/label-checks` — checks the confirmed fields against the current NAFDAC Greenbook export and the printed expiry date.
3. `GET /api/health` — liveness check.

Authentication and saved scan history are handled directly by the frontend Supabase client with RLS. Legacy `/api/scans` source files are still present for later cleanup, but they are not mounted by `server.js`.

## Setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
GEMINI_API_KEY=your_google_ai_studio_key
```

Generate/refresh the Greenbook export from the repository root:

```bash
npm run refresh-data
```

This writes `nafdac_greenbook_export.json` to the repository root. The file is intentionally gitignored; refresh it whenever you need newer reference data.

Start the backend:

```bash
npm run dev
```

## `POST /api/extract-label`

Public; no account required.

Request: `multipart/form-data` with one or both of:

- `front` — JPEG/PNG/WebP, max 8 MB
- `back` — JPEG/PNG/WebP, max 8 MB

The GenuineNG frontend always sends both. The backend buffers the request only in memory, sends the image bytes to Gemini, returns structured text fields, and does not write the images to disk or Supabase Storage.

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

If Gemini is unavailable or nothing readable is extracted:

```json
{
  "status": "extraction_unavailable",
  "fields": {
    "productName": null,
    "manufacturer": null,
    "registrationNumber": null,
    "expiryDate": null
  }
}
```

The frontend then offers Scan again or Enter info manually. Partial `completed` extraction is also allowed; the frontend requires product name, manufacturer and registration number before verification.

## `POST /api/label-checks`

Public; no account required.

Request:

```json
{
  "productName": "required string",
  "manufacturer": "required string",
  "registrationNumber": "required string",
  "expiryDate": "YYYY-MM-DD or null"
}
```

The endpoint runs exactly two independent checks:

- **registration** — exact Greenbook registration-number lookup, then Gemini-assisted comparison of product name + manufacturer against the matching record.
- **expiry** — date comparison using the confirmed printed expiry.

Response:

```json
{
  "status": "completed",
  "checks": {
    "registration": {
      "status": "match | warning | unverified | not_checked",
      "reason": "...",
      "source": "nafdac-greenbook-export (as of ...)",
      "checkedAt": "..."
    },
    "expiry": {
      "status": "match | warning | unverified | not_checked",
      "reason": "...",
      "source": "Printed expiry date",
      "checkedAt": "..."
    }
  },
  "summary": {
    "hasWarning": false,
    "allNotChecked": false
  },
  "checkedAt": "..."
}
```

If a NAFDAC number exists but product-name/manufacturer comparison cannot be completed, registration returns **unverified**, not match.

## Important interpretation rules

- `match` means the available printed details were consistent with the current reference check.
- `warning` means a concrete mismatch or expiry problem was found.
- `unverified` means GenuineNG could not confirm the record from the current source; it does **not** mean fake.
- `not_checked` means the check could not run, for example because no expiry date was supplied.
- Layer 1 never returns a blended genuine/fake score.
- A full counterfeit clone can copy a real product name, manufacturer and NAFDAC number; Layer 1 cannot prove the physical contents of a sealed pack.

## Tests

```bash
npm test
```

The automated tests cover expiry logic, registration outcomes, label-extraction normalization/merge behavior, and request validation without making live Gemini calls.

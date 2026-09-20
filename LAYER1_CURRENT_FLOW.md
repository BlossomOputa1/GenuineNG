# GenuineNG Layer 1 — current aligned flow

## User flow

1. User supplies exactly two photos in the UI: front + back.
2. Frontend resizes/compresses both photos to WebP in memory.
3. Frontend sends the two temporary files to `POST /api/extract-label`.
4. Backend keeps the upload in memory only, calls Gemini Vision server-side, and returns four fields:
   - productName
   - manufacturer
   - registrationNumber
   - expiryDate
5. Images are not written to disk, Supabase Storage, or scan history.
6. Frontend always shows the extracted fields in an editable confirmation modal.
7. Product name, manufacturer, and NAFDAC registration number are required. Expiry is optional.
8. Continue sends the confirmed values to `POST /api/label-checks`.
9. Backend runs only:
   - Registration: Greenbook number + product name + manufacturer identity check.
   - Expiry: date comparison.
10. Result shows each check independently. No genuine/fake verdict and no numeric score.
11. Guests keep results only in the active page session.
12. Signed-in users save confirmed text + check results directly to Supabase. Photos are never saved.

## Top-level result states

- **Checks complete** — every configured check returned an outcome and there is no warning.
- **Checks complete — attention needed** — every check ran but at least one returned `warning`.
- **Checks partially complete** — at least one check is `not_checked`, such as a missing expiry date.
- **Checks partially complete — attention needed** — partial result plus at least one warning.
- **Not enough information** — no check could run. This should be rare because the three registration identity fields are required before verification.

`unverified` is a completed check outcome, not a system error. It means the current source could not confirm the record.

## Architecture

- Gemini API key lives only in `backend/.env`.
- Greenbook registry verification runs in the backend.
- Supabase Auth + saved history are used directly from the frontend client with RLS.
- Legacy backend `/api/scans` files remain in the repository for now but are not mounted by `server.js`; they can be removed during a later cleanup.

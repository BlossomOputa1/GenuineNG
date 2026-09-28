# GenuineNG backend

Express API for Layer 1 label extraction/checks and Layer 2 manufacturer/code verification.

Use `../SETUP.md` for environment variables and database setup.

Key security rules:

- `SUPABASE_SECRET_KEY` and the Ed25519 private key are server-only.
- Manufacturer APIs require Supabase Auth plus an approved manufacturer row.
- Tenant ownership is enforced by request-scoped RLS clients and explicit ownership checks.
- Public QR anti-reuse transitions are atomic database functions called only through the backend service role.

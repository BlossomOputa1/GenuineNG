// import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { supabase } from '../config/supabaseClient';
// Verifies JWTs via Supabase's Auth server. Uses the publishable key —
// verification comes from the Auth API itself, not key privilege,
// so the secret key is never needed here.
const authClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY
);

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Missing or malformed Authorization header.',
      },
    });
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (!token) {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Missing bearer token.' },
    });
  }

  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Invalid or expired session.',
      },
    });
  }

  // Attach only the authenticated identity — never the raw token.
  req.user = { id: data.user.id };

  // Scoped client carrying the user's JWT, so RLS stays part of the
  // normal authorization path instead of relying on the secret key.
  req.supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  next();
}

import { createClient } from '@supabase/supabase-js';
import { supabase } from '../config/supabaseClient.js';

// Verifies JWTs via Supabase's Auth server using the centralized client.
// The per-request scoped client (req.supabase) carries the user's JWT
// so RLS policies are enforced correctly for downstream queries.

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

  const { data, error } = await supabase.auth.getUser(token);

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
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseAnonKey = (
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase auth configuration for request-scoped client.');
    return res.status(500).json({
      error: {
        code: 'AUTH_CONFIG_ERROR',
        message: 'Authentication is not configured correctly.',
      },
    });
  }

  req.supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  next();
}

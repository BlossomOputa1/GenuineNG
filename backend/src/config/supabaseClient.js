import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (
  process.env.SUPABASE_URL || ''
).trim();

const supabaseSecretKey = (
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  ''
).trim();

if (!supabaseUrl || !supabaseSecretKey) {
  console.error(
    'Environment check failed on Render:'
  );

  console.error(
    '- SUPABASE_URL found:',
    Boolean(supabaseUrl)
  );

  console.error(
    '- Secret key found:',
    Boolean(supabaseSecretKey)
  );

  console.error(
    '- Configured Supabase keys:',
    Object.keys(process.env).filter((key) =>
      key.toUpperCase().includes('SUPABASE')
    )
  );

  throw new Error(
    'Missing Supabase configuration. Check backend/.env.'
  );
}

/*
 * Server-side Supabase client.
 *
 * IMPORTANT:
 * This client uses the secret/service-role key.
 * Never expose this key to the frontend.
 */
export const supabase = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

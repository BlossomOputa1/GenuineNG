import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseSecretKey = (
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  ''
).trim();

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error('Missing server-side Supabase configuration.');
}

// Service-role client. Never expose its key to the browser.
export const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

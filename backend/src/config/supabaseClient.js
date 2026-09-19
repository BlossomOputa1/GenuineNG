import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error('Missing Supabase configuration. Check backend/.env.');
}

// Backend uses the secret key — full privileged access, RLS still applies
// unless explicitly bypassed, but this is never exposed to the frontend.
export const supabase = createClient(supabaseUrl, supabaseSecretKey);

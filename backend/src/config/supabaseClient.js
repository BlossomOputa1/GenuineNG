import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseSecretKey = (
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  ''
).trim();
// @BlossomOputa1: i was having issues with render so i have to add this for error handling
if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Enivironment check failed on Render:');
  console.error('- SUPABASE_URL found:', Boolean(supabaseUrl));
  console.error('- Secret key found:', Boolean(supabaseSecretKey));
  console.error('- Configured Supabase Keys:',
    Object.keys(process.env).filter(k => k.toUpperCase().includes('SUPABASE'))
  );
  throw new Error('Missing Supabase configuration. Check backend/.env.');
}

// Backend uses the secret key — full privileged access, RLS still applies
// unless explicitly bypassed, but this is never exposed to the frontend.
export const supabase = createClient(supabaseUrl, supabaseSecretKey);

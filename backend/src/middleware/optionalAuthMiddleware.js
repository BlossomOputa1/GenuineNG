import { createClient } from '@supabase/supabase-js';
import { supabase } from '../config/supabaseClient.js';

export async function optionalAuthMiddleware(req, _res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next();
  const token = header.slice(7).trim();
  if (!token) return next();

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return next();
    req.user = { id: data.user.id };

    const url = (process.env.SUPABASE_URL || '').trim();
    const anonKey = (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
    if (url && anonKey) {
      req.supabase = createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
  } catch {
    // Verification remains a public endpoint. A malformed/expired optional
    // token simply makes this a public scan rather than failing the scan.
  }
  return next();
}

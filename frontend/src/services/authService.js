import { supabase, supabaseConfigured } from './supabase';

function requireSupabase() {
  if (!supabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured yet. Add the frontend Supabase environment variables.');
  }
  return supabase;
}

export async function signInWithPassword(email, password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithPassword({ email, password, fullName }) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${window.location.origin}/app`,
    },
  });
  if (error) throw error;
  return data;
}

export async function sendPasswordReset(email) {
  const client = requireSupabase();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) throw new Error('Please enter your email address.');
  const { error } = await client.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
  return { success: true };
}

export async function updatePassword(password) {
  const client = requireSupabase();
  if (!password || password.length < 8) throw new Error('Password must be at least 8 characters long.');
  const { data, error } = await client.auth.updateUser({ password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

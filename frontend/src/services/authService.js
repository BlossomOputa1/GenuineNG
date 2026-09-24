import { supabase, supabaseConfigured } from './supabase';
import emailjs from '@emailjs/browser';

function requireSupabase() {
  if (!supabaseConfigured || !supabase) {
    throw new Error(
      'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env.',
    );
  }

  return supabase;
}

export async function signInWithPassword(email, password) {
  const client = requireSupabase();

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
}

export async function signUpWithPassword({
  email,
  password,
  fullName,
}) {
  const client = requireSupabase();

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${window.location.origin}/app`,
    },
  });

  if (error) throw error;

  return data;
}

/**
 * Sends a custom password-reset email through EmailJS.
 *
 * Flow:
 * Frontend
 *   ↓
 * GenuineNG backend
 *   ↓
 * Supabase generates recovery link
 *   ↓
 * EmailJS sends custom Gmail email
 *   ↓
 * User clicks reset link
 *   ↓
 * GenuineNG /reset-password
 */
export async function sendPasswordReset(email) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('Please enter your email address.');
  }

  const apiUrl = (
    import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL
  )?.trim();

  const emailjsServiceId =
    import.meta.env.VITE_EMAILJS_SERVICE_ID?.trim();

  const emailjsTemplateId =
    import.meta.env.VITE_EMAILJS_TEMPLATE_ID?.trim();

  const emailjsPublicKey =
    import.meta.env.VITE_EMAILJS_PUBLIC_KEY?.trim();

  if (!apiUrl) {
    throw new Error(
      'VITE_API_URL is not configured.',
    );
  }

  if (!emailjsServiceId) {
    throw new Error(
      'VITE_EMAILJS_SERVICE_ID is not configured.',
    );
  }

  if (!emailjsTemplateId) {
    throw new Error(
      'VITE_EMAILJS_TEMPLATE_ID is not configured.',
    );
  }

  if (!emailjsPublicKey) {
    throw new Error(
      'VITE_EMAILJS_PUBLIC_KEY is not configured.',
    );
  }

  /*
   * -------------------------------------------------------
   * STEP 1
   * Ask the GenuineNG backend to generate the
   * Supabase password recovery link.
   * -------------------------------------------------------
   */

  const response = await fetch(
    `${apiUrl}/api/password-reset/request`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        email: normalizedEmail,
      }),
    },
  );

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      'The server returned an invalid response.',
    );
  }

  if (!response.ok) {
    throw new Error(
      result?.error?.message ||
        'Could not generate password reset link.',
    );
  }

  if (!result?.resetLink) {
    throw new Error(
      'Supabase did not return a password reset link.',
    );
  }

  /*
   * -------------------------------------------------------
   * STEP 2
   * Prepare the variables that EmailJS will insert
   * into the email template.
   *
   * EmailJS template variables:
   *
   * {{to_email}}
   * {{name}}
   * {{reset_link}}
   * -------------------------------------------------------
   */

  const templateParams = {
    to_email: normalizedEmail,

    name:
      result?.name ||
      normalizedEmail.split('@')[0],

    reset_link: result.resetLink,
  };

  console.log(
    'Password reset link generated successfully.'
  );

  console.log(
    'Sending password reset email through EmailJS...'
  );

  console.log(
    'EmailJS Service ID:',
    emailjsServiceId
  );

  console.log(
    'EmailJS Template ID:',
    emailjsTemplateId
  );

  console.log(
    'Email recipient:',
    normalizedEmail
  );

  /*
   * -------------------------------------------------------
   * STEP 3
   * Send the custom email through EmailJS.
   * -------------------------------------------------------
   */

  try {
    const emailResponse = await emailjs.send(
      emailjsServiceId,
      emailjsTemplateId,
      templateParams,
      {
        publicKey: emailjsPublicKey,
      },
    );

    console.log(
      'EmailJS email sent successfully:',
      emailResponse
    );

  } catch (emailError) {
    console.error(
      '=========================================='
    );

    console.error(
      'EMAILJS PASSWORD RESET ERROR'
    );

    console.error(
      '=========================================='
    );

    console.error(
      'Full error:',
      emailError
    );

    console.error(
      'Status:',
      emailError?.status
    );

    console.error(
      'Text:',
      emailError?.text
    );

    console.error(
      'Message:',
      emailError?.message
    );

    console.error(
      'Service ID:',
      emailjsServiceId
    );

    console.error(
      'Template ID:',
      emailjsTemplateId
    );

    console.error(
      'Recipient:',
      normalizedEmail
    );

    console.error(
      '=========================================='
    );

    throw new Error(
      emailError?.text ||
        emailError?.message ||
        'Could not send a password reset email through EmailJS.'
    );
  }

  return {
    success: true,
  };
}

/**
 * Update the authenticated user's password.
 */
export async function updatePassword(password) {
  const client = requireSupabase();

  if (!password || password.length < 8) {
    throw new Error(
      'Password must be at least 8 characters long.',
    );
  }

  const { data, error } =
    await client.auth.updateUser({
      password,
    });

  if (error) throw error;

  return data;
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const client = requireSupabase();

  const { error } =
    await client.auth.signOut();

  if (error) throw error;
}

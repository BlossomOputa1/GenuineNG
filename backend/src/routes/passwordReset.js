import express from 'express';
import { supabase } from '../config/supabaseClient.js';

const router = express.Router();

router.post('/request', async (req, res) => {
  const email = String(req.body?.email || '')
    .trim()
    .toLowerCase();

  if (!email) {
    return res.status(400).json({
      error: {
        code: 'INVALID_EMAIL',
        message: 'Email address is required.',
      },
    });
  }

  const frontendOrigin = (
    process.env.FRONTEND_ORIGIN ||
    'http://localhost:5173'
  ).split(',')[0].trim();

  const redirectTo = `${frontendOrigin}/reset-password`;

  console.log('');
  console.log('========================================');
  console.log('PASSWORD RESET REQUEST');
  console.log('Email:', email);
  console.log('Redirect:', redirectTo);
  console.log('========================================');

  try {
    console.log('Generating Supabase recovery link...');

    const { data, error } =
      await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo,
        },
      });

    if (error) {
      console.error(
        'Supabase generateLink error:',
        error
      );

      return res.status(500).json({
        error: {
          code: 'PASSWORD_RESET_LINK_ERROR',
          message:
            error.message ||
            'Could not generate password reset link.',
        },
      });
    }

    const resetLink =
      data?.properties?.action_link;

    if (!resetLink) {
      console.error(
        'Supabase returned no action_link.'
      );

      return res.status(500).json({
        error: {
          code: 'RESET_LINK_MISSING',
          message:
            'Supabase did not return a password reset link.',
        },
      });
    }

    const name =
      data?.user?.user_metadata?.full_name ||
      data?.user?.user_metadata?.name ||
      email.split('@')[0];

    console.log(
      'Supabase recovery link generated successfully.'
    );

    return res.status(200).json({
      success: true,
      resetLink,
      name,
    });
  } catch (error) {
    console.error(
      'PASSWORD RESET UNEXPECTED ERROR:',
      error
    );

    return res.status(500).json({
      error: {
        code: 'PASSWORD_RESET_SERVER_ERROR',
        message:
          'Could not generate the password reset link.',
      },
    });
  }
});

export default router;
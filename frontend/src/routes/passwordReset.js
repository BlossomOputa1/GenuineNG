import express from 'express';
import { supabaseAdmin } from '../config/supabaseClient.js';

const router = express.Router();

router.post('/request', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        error: {
          code: 'EMAIL_REQUIRED',
          message: 'Email is required.',
        },
      });
    }

    const frontendOrigin =
      process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

    const redirectTo = `${frontendOrigin}/reset-password`;

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.error('Supabase recovery link error:', error);

      return res.status(400).json({
        error: {
          code: 'RESET_LINK_FAILED',
          message: error.message,
        },
      });
    }

    return res.json({
      success: true,
      email,
      resetLink: data.properties?.action_link || null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
import 'dotenv/config';

import express from 'express';
import cors from 'cors';

import labelChecksRouter from './routes/labelChecks.js';
import scansRouter from './routes/scans.js';
import extractLabelRouter from './routes/extractLabel.js';
import passwordResetRouter from './routes/passwordReset.js';

import { errorHandler } from './middleware/errorHandler.js';

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
];

const missing = requiredEnvVars.filter(
  (key) => !process.env[key]
);

if (missing.length > 0) {
  console.error(
    `Missing required environment variables: ${missing.join(', ')}`
  );

  process.exit(1);
}

const app = express();

const allowedOrigins = (
  process.env.FRONTEND_ORIGIN || ''
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  // Allow requests with no origin
  // (curl, mobile apps, server-to-server requests)
  if (!origin) return true;

  // If no explicit origins are configured,
  // allow all origins.
  if (allowedOrigins.length === 0) return true;

  // Allow explicitly configured origins.
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Allow Vercel preview deployments.
  if (
    /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin)
  ) {
    return true;
  }

  return false;
};

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      const error = new Error(
        'Origin not allowed by CORS policy.'
      );

      error.statusCode = 403;

      return callback(error);
    },

    credentials: true,
  })
);

app.use(
  express.json({
    limit: '32kb',
  })
);

/*
|--------------------------------------------------------------------------
| Health check
|--------------------------------------------------------------------------
*/

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'genuineng-layer1',
    time: new Date().toISOString(),
  });
});

/*
|--------------------------------------------------------------------------
| API routes
|--------------------------------------------------------------------------
*/

app.use(
  '/api/label-checks',
  labelChecksRouter
);

app.use(
  '/api/scans',
  scansRouter
);

app.use(
  '/api/extract-label',
  extractLabelRouter
);

app.use(
  '/api/password-reset',
  passwordResetRouter
);

console.log(
  'Password reset route registered: POST /api/password-reset/request'
);

/*
|--------------------------------------------------------------------------
| Multer / upload errors
|--------------------------------------------------------------------------
*/

app.use((err, req, res, next) => {
  if (err.message?.includes('File too large')) {
    return res.status(400).json({
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'Image must be under 8MB.',
      },
    });
  }

  if (
    err.message?.includes(
      'Only JPEG, PNG, or WebP'
    )
  ) {
    return res.status(400).json({
      error: {
        code: 'INVALID_FILE_TYPE',
        message: err.message,
      },
    });
  }

  next(err);
});

/*
|--------------------------------------------------------------------------
| General error handler
|--------------------------------------------------------------------------
*/

app.use(errorHandler);

/*
|--------------------------------------------------------------------------
| Start server
|--------------------------------------------------------------------------
*/

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(
    `GenuineNG Layer 1 backend running on port ${PORT}`
  );
});
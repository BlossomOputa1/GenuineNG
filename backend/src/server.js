import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';

import labelChecksRouter from './routes/labelChecks.js';
import scansRouter from './routes/scans.js';
import extractLabelRouter from './routes/extractLabel.js';
import manufacturerRouter from './routes/manufacturer.js';
import verifyCodeRouter from './routes/verifyCode.js';
import bmoniRouter from './routes/bmoni.js'; // Layer 2 BMoni routes (VBA, offramp, webhooks)

import './services/keyManager.js';
import { errorHandler } from './middleware/errorHandler.js';
import partnerApplicationsRouter from './routes/partnerApplications.js';

// BMoni sandbox default
process.env.BMONI_BASE_URL =
  process.env.BMONI_BASE_URL || 'https://embedded-dev.bmoni.com';

const requiredEnvVars = [
  'GEMINI_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'GENUINENG_ED25519_PRIVATE_KEY',
  'GENUINENG_ED25519_PUBLIC_KEY',
  'GENUINENG_KEY_VERSION',
  // BMoni Layer 2 Configuration
  'BMONI_API_KEY',
  'BMONI_BASE_URL',
  'BMONI_WEBHOOK_SECRET',
  'BMONI_SECP256K1_PRIVATE_KEY',
];

const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `Startup aborted. Missing required environment variables: ${missing.join(', ')}. Configure these in the Render service environment.`
  );
  process.exit(1);
}

const secpKey = process.env.BMONI_SECP256K1_PRIVATE_KEY;
if (secpKey && !/^0x[0-9a-fA-F]{64}$/.test(secpKey)) {
  console.error(
    'Startup aborted. BMONI_SECP256K1_PRIVATE_KEY must be a 32-byte hex string starting with 0x (66 characters total).'
  );
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_ORIGIN) {
  throw new Error('FRONTEND_ORIGIN must be set in production.');
}

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const previewOriginPattern =
  /^https:\/\/genuine-ng(?:-[a-z0-9-]+)*\.vercel\.app$/i;

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (previewOriginPattern.test(origin)) return true;
  return false;
};

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      const error = new Error('Origin not allowed by CORS policy.');
      error.statusCode = 403;
      return callback(error);
    },
    credentials: true,
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    status: 'error',
    reason: 'Too many requests. Please try again in a few minutes.',
  },
});

// Manufacturer generation can legitimately require up to 100 chunk requests
// for a 100,000-unit batch. Authentication + ownership checks still apply.
const manufacturerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 240,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many manufacturer requests. Please retry shortly.' },
  },
});

// Preserve raw body buffer for webhook signature validation
app.use(
  express.json({
    limit: '32kb',
    verify: (req, res, buf) => {
      if (req.originalUrl.startsWith('/api/bmoni/webhook')) {
        req.rawBody = buf;
      }
    },
  })
);
app.use(compression());

app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} ${req.method} ${req.originalUrl} | req.ip=${req.ip} | x-forwarded-for=${req.headers['x-forwarded-for'] || '(missing)'}`
  );
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'genuineng',
    time: new Date().toISOString(),
  });
});

// Layer 1 routes
app.use('/api', apiLimiter, extractLabelRouter);
app.use('/api/label-checks', apiLimiter, labelChecksRouter);
app.use('/api/scans', scansRouter);
if (process.env.MANUFACTURER_PORTAL_ENABLED !== 'false') {
  app.use('/api/manufacturer', manufacturerLimiter, manufacturerRouter);
} else {
  app.use('/api/manufacturer', (_req, res) => res.status(503).json({
    error: { code: 'MANUFACTURER_PORTAL_DISABLED', message: 'The manufacturer portal is currently disabled.' },
  }));
}
app.use('/api/partner-applications', apiLimiter, partnerApplicationsRouter);
app.use('/api/verify-code', apiLimiter, verifyCodeRouter);

// Layer 2 BMoni routes (Webhook endpoint inside bmoniRouter is not rate-limited by apiLimiter)
app.use('/api/bmoni', bmoniRouter);

app.use('/api', (req, res) => {
  return res.status(404).json({
    status: 'error',
    reason: 'API route not found.',
  });
});

// Multer error boundary
app.use((err, req, res, next) => {
  if (err.message?.includes('File too large')) {
    return res.status(400).json({
      error: { code: 'FILE_TOO_LARGE', message: 'Image must be under 8MB.' },
    });
  }
  if (err.message?.includes('Only JPEG, PNG, or WebP')) {
    return res
      .status(400)
      .json({ error: { code: 'INVALID_FILE_TYPE', message: err.message } });
  }
  next(err);
});

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`GenuineNG backend running on port ${PORT}`)
);
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import labelChecksRouter from './routes/labelChecks.js';
import scansRouter from './routes/scans.js';
import extractLabelRouter from './routes/extractLabel.js';
import manufacturerRouter from './routes/manufacturer.js';
import { errorHandler } from './middleware/errorHandler.js';

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
];
const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `Missing required environment variables: ${missing.join(', ')}`
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

app.use(express.json({ limit: '32kb' }));

app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} ${req.method} ${req.originalUrl} | req.ip=${req.ip} | x-forwarded-for=${req.headers['x-forwarded-for'] || '(missing)'}`
  );
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'genuineng-layer1',
    time: new Date().toISOString(),
  });
});

app.use('/api', apiLimiter, extractLabelRouter);
app.use('/api/label-checks', apiLimiter, labelChecksRouter);
app.use('/api/scans', scansRouter);
app.use('/api/manufacturer', apiLimiter, manufacturerRouter);

app.use('/api', (req, res) => {
  return res.status(404).json({
    status: 'error',
    reason: 'API route not found.',
  });
});

// Catches multer's file-size/file-type errors before the general error
// handler, since multer throws plain Errors rather than using statusCode.
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
  console.log(`GenuineNG Layer 1 backend running on port ${PORT}`)
);

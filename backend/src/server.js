import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import labelChecksRouter from './routes/labelChecks.js';
import scansRouter from './routes/scans.js';
import extractLabelRouter from './routes/extractLabel.js';
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

const app = express();

const allowedOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  // Allow requests with no origin (curl, mobile apps, server-to-server health checks)
  if (!origin) return true;

  // If no explicit origins are set in environment, permit all by default
  if (allowedOrigins.length === 0) return true;

  // Exact match from FRONTEND_ORIGIN (e.g. production domain or localhost)
  if (allowedOrigins.includes(origin)) return true;

  // Allow all dynamic Vercel pull request / preview deployment branches
  if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;

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

app.use(express.json({ limit: '32kb' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'genuineng-layer1',
    time: new Date().toISOString(),
  });
});

app.use('/api/label-checks', labelChecksRouter);
app.use('/api/scans', scansRouter);
app.use('/api/extract-label', extractLabelRouter);

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

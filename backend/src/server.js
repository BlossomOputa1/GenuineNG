import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import labelChecksRouter from './routes/labelChecks.js';
import scansRouter from './routes/scans.js';
import scansRouter from './routes/scans.js';
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
    .map((value) => value.trim().replace(/\/$/, '')) // strip trailing slashes
    .filter(Boolean);

  const isAllowedOrigin = (origin) => {
    // Allow requests with no origin (cURL, mobile native HTTP clients, server health checks)
    if (!origin) return true;

    // Fallback: If no origins configured, permit all in development
    if (allowedOrigins.length === 0) return true;

    // Exact origin match
    if (allowedOrigins.includes(origin)) return true;

    // Dynamic Vercel preview & production deployment URLs
    if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;

    return false;
  };

  const corsOptions = {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      // Return null, false rather than throwing an Error object to cleanly reject unauthorized origins
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

  // Apply CORS middleware
  app.use(cors(corsOptions));
  // Explicitly handle all preflight OPTIONS requests
  app.options('*', cors(corsOptions));

  app.use(express.json({ limit: '32kb' }));

  // Health Check Endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'genuineng-layer1',
      time: new Date().toISOString(),
    });
  });

  // Routes
  app.use('/api/label-checks', labelChecksRouter);
  app.use('/api/scans', scansRouter);

  // Global Error Handler
  app.use(errorHandler);

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`GenuineNG Layer 1 backend running on port ${PORT}`));
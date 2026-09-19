import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import labelChecksRouter from './routes/labelChecks.js';
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
}

const app = express();

const allowedOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin)
      )
        return callback(null, true);
      const error = new Error('Origin not allowed by CORS policy.');
      error.statusCode = 403;
      return callback(error);
    },
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

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`GenuineNG Layer 1 backend running on port ${PORT}`)
);

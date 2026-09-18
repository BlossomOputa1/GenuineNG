import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import labelChecksRouter from './routes/labelChecks.js';
import { errorHandler } from './middleware/errorHandler.js';

// Fail fast: catch missing config immediately, not mid-request later.
// (No required secrets yet since we're on mock data — this is a placeholder
// for when Supabase keys or similar get added.)
const requiredEnvVars = [];
const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `Missing required environment variables: ${missing.join(', ')}`
  );
  process.exit(1);
}

const app = express();

// Dev-only permissive CORS; tighten this before any real deployment.
app.use(cors());
app.use(express.json({ limit: '10kb' }));

app.use('/api/label-checks', labelChecksRouter);

// Must be registered after all routes.
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`Verification backend running on port ${PORT}`)
);

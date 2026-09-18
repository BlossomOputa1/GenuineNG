import express from 'express';
import cors from 'cors';
import 'dotenv/config';
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
app.use(cors());
app.use(express.json({ limit: '10kb' }));

app.use('/api/label-checks', labelChecksRouter);
app.use('/api/scans', scansRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import labelChecksRouter from './routes/labelChecks.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

const allowedOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map(value => value.trim())
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
  res.json({ status: 'ok', service: 'genuineng-layer1', time: new Date().toISOString() });
});

app.use('/api/label-checks', labelChecksRouter);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`GenuineNG Layer 1 backend running on port ${PORT}`));
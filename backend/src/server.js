import express from 'express';
import cors from 'cors';
import labelChecksRouter from './routes/labelChecks.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/label-checks', labelChecksRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`Verification backend running on port ${PORT}`)
);

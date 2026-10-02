import 'dotenv/config';
import axios from 'axios';

const baseURL = (process.env.BMONI_BASE_URL || 'https://embedded-dev.bmoni.com').replace(/\/+$/, '');
const apiKey = process.env.BMONI_API_KEY || process.env.BMONI_SECRET_KEY || '';

const bmoniClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'x-api-key': apiKey,
    'x-partner-key': apiKey,
  },
});

export default bmoniClient;
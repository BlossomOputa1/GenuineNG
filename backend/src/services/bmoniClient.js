import axios from 'axios';

const rawBase = (process.env.BMONI_BASE_URL || 'https://embedded-dev.bmoni.com').replace(/\/+$/, '');
const baseURL = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;

const bmoniClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.BMONI_API_KEY || process.env.BMONI_SECRET_KEY}`,
  },
});

export default bmoniClient;
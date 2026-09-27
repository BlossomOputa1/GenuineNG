// services/bmoniClient.js
import 'dotenv/config';
import axios from 'axios';

const bmoniClient = axios.create({
  baseURL: process.env.BMONI_BASE_URL || 'https://embedded-dev.bmoni.com',
  headers: {
    'Authorization': `Bearer ${process.env.BMONI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export default bmoniClient;
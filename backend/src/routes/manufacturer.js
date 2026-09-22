import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { manufacturerAuthMiddleware } from '../middleware/manufacturerAuthMiddleware.js';
import { registerProduct } from '../controllers/manufacturerController.js';

const router = express.Router();

router.post(
  '/products',
  authMiddleware,
  manufacturerAuthMiddleware,
  registerProduct
);

export default router;

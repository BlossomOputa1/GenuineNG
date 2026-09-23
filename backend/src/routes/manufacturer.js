import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { manufacturerAuthMiddleware } from '../middleware/manufacturerAuthMiddleware.js';
import {
  registerProduct,
  createBatchController,
  generateCodesController,
  scanActivityController,
  exportBatchController,
} from '../controllers/manufacturerController.js';

const router = express.Router();

router.post(
  '/products',
  authMiddleware,
  manufacturerAuthMiddleware,
  registerProduct
);
router.post(
  '/batches',
  authMiddleware,
  manufacturerAuthMiddleware,
  createBatchController
);
router.post(
  '/batches/:id/generate-codes',
  authMiddleware,
  manufacturerAuthMiddleware,
  generateCodesController
);
router.get(
  '/scan-activity',
  authMiddleware,
  manufacturerAuthMiddleware,
  scanActivityController
);
router.get(
  '/batches/:id/export',
  authMiddleware,
  manufacturerAuthMiddleware,
  exportBatchController
);

export default router;

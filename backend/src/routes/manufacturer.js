import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { manufacturerAuthMiddleware } from '../middleware/manufacturerAuthMiddleware.js';
import {
  registerProduct,
  listProductsController,
  createBatchController,
  listBatchesController,
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
router.get(
  '/products',
  authMiddleware,
  manufacturerAuthMiddleware,
  listProductsController
);
router.post(
  '/batches',
  authMiddleware,
  manufacturerAuthMiddleware,
  createBatchController
);
router.get(
  '/batches',
  authMiddleware,
  manufacturerAuthMiddleware,
  listBatchesController
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

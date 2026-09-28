import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { manufacturerAuthMiddleware } from '../middleware/manufacturerAuthMiddleware.js';
import {
  registerProduct,
  updateProductController,
  listProductsController,
  createBatchController,
  listBatchesController,
  generationStatusController,
  generateCodesController,
  scanActivityController,
  exportBatchController,
} from '../controllers/manufacturerController.js';

const router = express.Router();
router.use(authMiddleware, manufacturerAuthMiddleware);
router.get('/products', listProductsController);
router.post('/products', registerProduct);
router.patch('/products/:id', updateProductController);
router.get('/batches', listBatchesController);
router.post('/batches', createBatchController);
router.get('/batches/:id/generation-status', generationStatusController);
router.post('/batches/:id/generate-codes', generateCodesController);
router.get('/scan-activity', scanActivityController);
router.get('/batches/:id/export', exportBatchController);
export default router;

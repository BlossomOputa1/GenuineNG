import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { manufacturerAuthMiddleware } from '../middleware/manufacturerAuthMiddleware.js';
import { sandboxBillingEnabled } from '../services/bmoniClient.js';
import { PRICE_PER_CODE_NGN, createTokenInvoice, getTokenAccount, getTokenInvoice, listInvoices } from '../services/bmoniService.js';
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

router.get('/billing/config', (_req, res) => res.json({ enabled: sandboxBillingEnabled(), pricePerCode: PRICE_PER_CODE_NGN, environment: 'sandbox' }));
router.get('/tokens', async (req, res, next) => {
  try { res.json({ account: await getTokenAccount(req.manufacturer.id) }); } catch (error) { next(error); }
});
router.get('/invoices', async (req, res, next) => {
  try { res.json({ invoices: await listInvoices(req.manufacturer.id) }); } catch (error) { next(error); }
});
router.get('/token-invoices/:id', async (req, res, next) => {
  try { res.json({ invoice: await getTokenInvoice(req.manufacturer.id, req.params.id) }); } catch (error) { next(error); }
});
router.post('/token-invoices', async (req, res, next) => {
  try { res.json({ invoice: await createTokenInvoice(req.manufacturer.id, req.body?.quantity) }); }
  catch (error) { next(error); }
});

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

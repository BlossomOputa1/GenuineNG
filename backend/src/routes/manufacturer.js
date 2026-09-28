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
import bmoniClient from '../services/bmoniClient.js';
import { supabase } from '../config/supabaseClient.js';

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

/**
 * POST /api/manufacturer/vba
 * Generates a dedicated Nigerian Virtual Bank Account to fund code generation.
 */
router.post(
  '/vba',
  authMiddleware,
  manufacturerAuthMiddleware,
  async (req, res, next) => {
    try {
      const { batchId, amount } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          error: { code: 'INVALID_AMOUNT', message: 'A valid funding amount is required.' },
        });
      }

      // 1. Fetch the manufacturer record to check for existing bmoni_smart_wallet_id
      const { data: mfgRecord, error: mfgError } = await supabase
        .from('manufacturers')
        .select('*')
        .eq('id', req.manufacturer.id)
        .maybeSingle();

      if (mfgError) {
        console.error('Error fetching manufacturer record:', mfgError);
      }

      let smartWalletId = mfgRecord?.bmoni_smart_wallet_id;

      // 2. Fallback: If wallet wasn't provisioned during signup, provision one now
      if (!smartWalletId) {
        const walletRes = await bmoniClient.post('/v1/smart-wallets', {
          name: req.manufacturer.companyName || `Mfg-${req.manufacturer.id}`,
        });
        const walletData = walletRes.data?.data || walletRes.data;
        smartWalletId = walletData?.id || walletData?.smartWalletId;

        if (!smartWalletId) {
          throw new Error('BMoni did not return a valid smart wallet ID.');
        }

        // Cache the newly created smart wallet ID on the manufacturer profile
        try {
          await supabase
            .from('manufacturers')
            .update({ bmoni_smart_wallet_id: smartWalletId })
            .eq('id', req.manufacturer.id);
        } catch (cacheErr) {
          console.warn('[BMoni VBA] Note: Could not cache bmoni_smart_wallet_id:', cacheErr.message);
        }
      }

      // 3. Request a dynamic Nigerian Virtual Bank Account from BMoni
      const vbaResponse = await bmoniClient.post(
        `/v1/smart-wallets/${smartWalletId}/onramp/vba/nigeria`,
        {
          amount: Number(amount),
        }
      );

      const vbaData = vbaResponse.data?.data || vbaResponse.data;
      const accountNumber = vbaData.account_number || vbaData.accountNumber;
      const bankName = vbaData.bank_name || vbaData.bankName;
      const accountName = vbaData.account_name || vbaData.accountName;
      const reference = vbaData.reference;
      const expiresAt = vbaData.expires_at || vbaData.expiresAt;

      // 4. Save the pending invoice in Supabase so the webhook can match & unlock codes later
      const { data: invoiceRecord, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          manufacturer_id: req.manufacturer.id,
          batch_id: batchId || null,
          reference: reference,
          amount: Number(amount),
          currency: 'NGN',
          status: 'pending', // Unlocks to 'settled' upon smart_wallet.credited webhook
        })
        .select()
        .maybeSingle();

      if (invoiceError) {
        console.error('Failed to create pending invoice record:', invoiceError);
        return res.status(500).json({
          error: { code: 'DB_ERROR', message: 'Could not record invoice state.' },
        });
      }

      // 5. Return account details for the manufacturer to make the bank transfer
      return res.status(201).json({
        accountNumber,
        bankName,
        accountName,
        reference,
        amount: Number(amount),
        expiresAt,
        invoiceId: invoiceRecord?.id,
      });
    } catch (err) {
      console.error('[BMoni VBA Error]:', err.response?.data || err.message);
      return res.status(err.response?.status || 500).json({
        error: {
          code: 'BMONI_VBA_FAILED',
          message: err.response?.data?.message || err.message || 'Failed to generate Virtual Bank Account rail.',
        },
      });
    }
  }
);

export default router;
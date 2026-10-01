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
router.post('/vba', async (req, res) => {
  try {
    const { batchId, amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        error: { code: 'INVALID_AMOUNT', message: 'A valid funding amount is required.' },
      });
    }

    const numericAmount = Number(amount);
    const reference = `bmoni_ref_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Deterministic BMoni sandbox virtual account rail
    const vbaDetails = {
      accountNumber: '7820194821',
      bankName: 'Wema Bank',
      accountName: `GenuineNG / ${req.manufacturer.companyName || 'Manufacturer'}`,
      reference,
      amount: numericAmount,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    // Save pending invoice in Supabase so webhook can settle & unlock codes
    const { data: invoiceRecord, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        manufacturer_id: req.manufacturer.id,
        batch_id: batchId || null,
        reference: reference,
        amount: numericAmount,
        currency: 'NGN',
        status: 'pending',
      })
      .select()
      .maybeSingle();

    if (invoiceError) {
      console.error('Failed to create pending invoice record:', invoiceError);
      return res.status(500).json({
        error: { code: 'DB_ERROR', message: 'Could not record invoice state.' },
      });
    }

    return res.status(201).json({
      accountNumber: vbaDetails.accountNumber,
      bankName: vbaDetails.bankName,
      accountName: vbaDetails.accountName,
      reference: vbaDetails.reference,
      amount: vbaDetails.amount,
      expiresAt: vbaDetails.expiresAt,
      invoiceId: invoiceRecord?.id,
    });
  } catch (err) {
    console.error('[BMoni VBA Error]:', err.message);
    return res.status(500).json({
      error: {
        code: 'BMONI_VBA_FAILED',
        message: err.message || 'Failed to generate Virtual Bank Account rail.',
      },
    });
  }
});

/**
 * POST /api/manufacturer/sandbox-settle
 * Instantly marks a test invoice as settled so demo/sandbox runs can proceed without external webhooks.
 */
router.post('/sandbox-settle', async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({
        error: { code: 'INVALID_REFERENCE', message: 'Invoice reference is required.' },
      });
    }

    // Verify invoice belongs to the requesting manufacturer
    const { data: invoice, error: findError } = await supabase
      .from('invoices')
      .select('id, batch_id, status')
      .eq('reference', reference)
      .eq('manufacturer_id', req.manufacturer.id)
      .maybeSingle();

    if (findError || !invoice) {
      return res.status(404).json({
        error: { code: 'INVOICE_NOT_FOUND', message: 'No matching test invoice found.' },
      });
    }

    // Update status to settled
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'settled',
        settled_at: new Date().toISOString(),
      })
      .eq('id', invoice.id);

    if (updateError) {
      return res.status(500).json({
        error: { code: 'DB_ERROR', message: updateError.message },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Sandbox payment verified and settled successfully.',
      invoiceId: invoice.id,
      batchId: invoice.batch_id,
    });
  } catch (err) {
    console.error('[Sandbox Settle Error]:', err.message);
    return res.status(500).json({
      error: { code: 'SETTLE_FAILED', message: err.message },
    });
  }
});

export default router;
import express from 'express';
import {
  approvePartnerApplication,
  reviewPartnerApplication,
  submitPartnerApplication,
} from '../controllers/partnerApplicationController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { partnerAdminMiddleware } from '../middleware/partnerAdminMiddleware.js';

const router = express.Router();

router.post('/', submitPartnerApplication);
router.get('/review', authMiddleware, partnerAdminMiddleware, reviewPartnerApplication);
router.post('/approve', authMiddleware, partnerAdminMiddleware, approvePartnerApplication);

export default router;

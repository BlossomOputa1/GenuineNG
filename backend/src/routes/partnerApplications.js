import express from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  approvePartnerApplication,
  getPartnerEmailStatus,
  listPendingPartnerApplications,
  rejectPartnerApplication,
  resendPartnerApplication,
  reviewPartnerApplication,
  submitPartnerApplication,
} from '../controllers/partnerApplicationController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { partnerAdminMiddleware } from '../middleware/partnerAdminMiddleware.js';

const router = express.Router();

// Public submit is spam-sensitive (each hit can trigger admin emails):
// 10 submissions per IP per hour, on top of the global apiLimiter in server.js.
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many applications. Please try again later.' },
  },
});

router.post('/', submitLimiter, submitPartnerApplication);
router.get('/email-status', authMiddleware, partnerAdminMiddleware, getPartnerEmailStatus);
router.get('/pending', authMiddleware, partnerAdminMiddleware, listPendingPartnerApplications);
router.get('/review', authMiddleware, partnerAdminMiddleware, reviewPartnerApplication);
router.post('/approve', authMiddleware, partnerAdminMiddleware, approvePartnerApplication);
router.post('/reject', authMiddleware, partnerAdminMiddleware, rejectPartnerApplication);
router.post('/resend', authMiddleware, partnerAdminMiddleware, resendPartnerApplication);

export default router;

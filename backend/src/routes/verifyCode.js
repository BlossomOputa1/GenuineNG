import express from 'express';
import { verifyCode } from '../controllers/verifyCodeController.js';
import { optionalAuthMiddleware } from '../middleware/optionalAuthMiddleware.js';

const router = express.Router();
router.post('/', optionalAuthMiddleware, verifyCode);
export default router;

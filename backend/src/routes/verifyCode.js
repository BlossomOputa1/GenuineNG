import express from 'express';
import { verifyCode } from '../controllers/verifyCodeController.js';

const router = express.Router();

// Deliberately public — no authMiddleware. Any customer can scan and
// verify a code without an account. Rate limiting still applies at
// the mount point in server.js.
router.post('/', verifyCode);

export default router;

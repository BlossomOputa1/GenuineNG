import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  listScans,
  getScan,
  createScan,
  deleteScan,
} from '../controllers/scansController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', listScans);
router.get('/:id', getScan);
router.post('/', createScan);
router.delete('/:id', deleteScan);

export default router;

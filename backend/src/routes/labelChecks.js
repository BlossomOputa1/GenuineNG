import express from 'express';
import { runLabelChecks } from '../controllers/labelChecksController.js';
import { validateLabelChecksRequest } from '../middleware/validation.js';

const router = express.Router();
router.post('/', validateLabelChecksRequest, runLabelChecks);

export default router;

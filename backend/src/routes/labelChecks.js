import express from 'express';
import { runLabelChecks } from '../controllers/labelChecksController.js';
import { validateLabelChecksRequest } from '../middleware/validation.js';
// import { runLabelVerification } from '../../../frontend/src/services/api.js';

const router = express.Router();
router.post('/', validateLabelChecksRequest, runLabelChecks, runLabelVerification);

export default router;

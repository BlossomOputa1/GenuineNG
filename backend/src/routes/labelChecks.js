import express from 'express';
import { runLabelChecks } from '../controllers/labelChecksController.js';

const router = express.Router();
router.post('/', runLabelChecks);

export default router;

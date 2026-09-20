import express from 'express';
import { extractLabel } from '../controllers/extractLabelController.js';
import { multipartImages } from '../middleware/multipartImages.js';

const router = express.Router();
router.post('/', multipartImages, extractLabel);

export default router;

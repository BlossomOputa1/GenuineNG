import express from 'express';
import multer from 'multer';
import { runLabelExtraction } from '../controllers/extractLabelController.js';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 2,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      const error = new Error('Only JPEG, PNG, or WebP images are accepted.');
      error.statusCode = 415;
      return cb(error);
    }
    return cb(null, true);
  },
});

const router = express.Router();

router.post(
  '/',
  upload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 },
  ]),
  runLabelExtraction,
);

export default router;

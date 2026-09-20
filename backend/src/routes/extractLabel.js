import express from 'express';
import multer from 'multer';
import { runLabelExtraction } from '../controllers/extractLabelController.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, or WebP images are accepted.'));
    }
    cb(null, true);
  },
});

const router = express.Router();

// Accepts one or both of "front" and "back" — at least one is required,
// checked in the controller since multer alone can't enforce "at least one of".
router.post(
  '/',
  upload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 },
  ]),
  runLabelExtraction
);

export default router;

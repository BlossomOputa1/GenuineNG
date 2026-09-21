import { extractLabelFields } from '../services/labelExtractor.js';

export function multerFilesToImages(files = {}) {
  const front = files.front?.[0] || null;
  const back = files.back?.[0] || null;

  return {
    front: front
      ? {
          buffer: front.buffer,
          mimeType: front.mimetype,
          originalName: front.originalname,
        }
      : null,
    back: back
      ? {
          buffer: back.buffer,
          mimeType: back.mimetype,
          originalName: back.originalname,
        }
      : null,
  };
}

export async function runLabelExtraction(req, res, next) {
  try {
    const images = multerFilesToImages(req.files);

    if (!images.front && !images.back) {
      return res.status(400).json({
        status: 'error',
        reason: 'At least one front or back image is required.',
      });
    }

    const result = await extractLabelFields(images, { signal: req.signal });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

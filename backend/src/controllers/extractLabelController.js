import { extractLabelFields } from '../services/labelExtractor.js';

export async function extractLabel(req, res, next) {
  try {
    const result = await extractLabelFields(req.labelImages || {});
    res.json(result);
  } catch (error) {
    next(error);
  }
}

import { buildResult } from '../services/resultBuilder.js';

export async function runLabelChecks(req, res, next) {
  try {
    const result = await buildResult(req.body);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

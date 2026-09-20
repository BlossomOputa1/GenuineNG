import { buildResult } from '../services/resultBuilder.js';

export async function runLabelChecks(req, res) {
  const result = await buildResult(req.body);
  res.json(result);
}

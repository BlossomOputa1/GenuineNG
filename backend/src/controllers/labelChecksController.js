import { buildResult } from '../services/resultBuilder.js';

export function runLabelChecks(req, res) {
  const result = buildResult(req.body);
  res.json(result);
}

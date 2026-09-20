import { extractLabelFields } from '../services/labelExtractor.js';

const FIELD_NAMES = [
  'productName',
  'manufacturer',
  'registrationNumber',
  'expiryDate',
];

/**
 * Merges front/back extraction results. Prefers front's value for a field
 * when present; falls back to back's value otherwise. Neither side is
 * assumed authoritative — this is a simple "take whichever side actually
 * read something" merge, not a front-vs-back specialization.
 */
function mergeFields(front, back) {
  const merged = {};
  for (const name of FIELD_NAMES) {
    merged[name] = front?.[name] ?? back?.[name] ?? null;
  }
  return merged;
}

export async function runLabelExtraction(req, res) {
  const frontFile = req.files?.front?.[0];
  const backFile = req.files?.back?.[0];

  if (!frontFile && !backFile) {
    return res.status(400).json({
      error: {
        code: 'NO_IMAGE',
        message:
          "At least one image is required (field name 'front' or 'back').",
      },
    });
  }

  const [frontResult, backResult] = await Promise.all([
    frontFile
      ? extractLabelFields(frontFile.buffer, frontFile.mimetype)
      : Promise.resolve(null),
    backFile
      ? extractLabelFields(backFile.buffer, backFile.mimetype)
      : Promise.resolve(null),
  ]);

  const frontFailed = frontFile && !frontResult.success;
  const backFailed = backFile && !backResult.success;

  if (frontFailed && backFailed) {
    return res.status(200).json({
      status: 'extraction_unavailable',
      reason: `Front: ${frontResult.reason} Back: ${backResult.reason}`,
      fields: mergeFields(null, null),
    });
  }

  const merged = mergeFields(
    frontResult?.success ? frontResult.fields : null,
    backResult?.success ? backResult.fields : null
  );

  res.status(200).json({ status: 'completed', fields: merged });
}

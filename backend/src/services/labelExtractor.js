const GEMINI_MODEL = 'gemini-3.5-flash-lite'; // or gemini-1.5-flash / gemini-3.5-flash-lite
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const EXTRACTION_PROMPT = `You are reading a photo of a pharmaceutical/consumer product label sold in Nigeria.
Extract exactly these fields if visible. If a field is not visible or not present, use null — never guess.

Respond with ONLY a JSON object, no other text:
{
  "productName": string or null,
  "manufacturer": string or null,
  "registrationNumber": string or null,
  "expiryDate": string in YYYY-MM-DD format or null
}

Field definitions — be precise:
- productName: the specific product name as printed (e.g. "Nivea Radiant & Beauty Even Glow Body Lotion").
- manufacturer: the LEGAL COMPANY that made the product — NOT the brand name on the front of the pack.
  Look specifically for text like "Manufactured by", "Made by", "Distributed by", or a company name
  followed by a legal suffix (Ltd, PLC, GmbH, AG, Inc, Limited, Co).
- registrationNumber: the NAFDAC registration number, usually printed as "NAFDAC Reg. No." or similar.
- expiryDate: convert it to YYYY-MM-DD. If only month/year is printed, use the last day of that month.

Do not infer or guess a field that isn't legible in the photo.`;

const STRING_FIELDS = ['productName', 'manufacturer', 'registrationNumber'];

function isValidCalendarDate(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr))
    return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

export function normalizeExtractedFields(fields = {}) {
  const normalized = {};

  for (const key of STRING_FIELDS) {
    const value = fields[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      normalized[key] = trimmed === '' ? null : trimmed;
    } else {
      normalized[key] = null;
    }
  }

  normalized.expiryDate = isValidCalendarDate(fields.expiryDate)
    ? fields.expiryDate
    : null;

  return normalized;
}

export function mergeExtractedFields(front, back) {
  const merged = {};
  for (const key of [...STRING_FIELDS, 'expiryDate']) {
    merged[key] = front?.[key] ?? back?.[key] ?? null;
  }
  return merged;
}

async function requestGemini(imageItem, apiKey, fetchFn) {
  if (!imageItem?.buffer) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetchFn(GEMINI_URL, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: EXTRACTION_PROMPT },
              {
                inlineData: {
                  mimeType: imageItem.mimeType || 'image/jpeg',
                  data: imageItem.buffer.toString('base64'),
                },
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`Gemini call error (${res.status}):`, errText);
      return null;
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return null;

    const cleaned = text.replace(/^```json\s*|\s*```$/g, '');
    const parsed = JSON.parse(cleaned);
    return normalizeExtractedFields(parsed);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Extracts label fields from the images object passed by extractLabelController
 * @param {Object} images - { front: { buffer, mimeType }, back: { buffer, mimeType } }
 */
export async function extractLabelFields(images, deps = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  const fetchFn = deps.fetch || fetch;

  if (!apiKey) {
    return { success: false, reason: 'Gemini API key not configured.' };
  }

  try {
    // Process front and back images in parallel
    const [frontResult, backResult] = await Promise.all([
      requestGemini(images.front, apiKey, fetchFn),
      requestGemini(images.back, apiKey, fetchFn),
    ]);

    const merged = mergeExtractedFields(frontResult, backResult);

    // If at least one field was found, mark as success
    const hasAnyField = Object.values(merged).some((val) => val !== null);

    return {
      success: true,
      fields: merged,
      status: hasAnyField ? 'success' : 'extraction_unavailable',
    };
  } catch (err) {
    console.error('Extraction handler failed:', err);
    return {
      success: false,
      reason: `Extraction failed: ${err.message}`,
    };
  }
}
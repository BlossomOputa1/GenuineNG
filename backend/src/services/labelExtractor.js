const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_TIMEOUT_MS = 45_000;
const EXTRACTION_TIMEOUT_MESSAGE =
  'Image extraction timed out. Please try again with a clearer photo or enter details manually.';

const EXTRACTION_PROMPT = `You are an OCR and packaging data extraction specialist for consumer goods and pharmaceuticals sold in Nigeria.
Inspect the provided image(s) carefully. Read all packaging text, including small print, stamps, embossing, and back-panel label details.

Return ONLY a valid JSON object with these keys:
{
  "productName": string or null,
  "manufacturer": string or null,
  "registrationNumber": string or null,
  "expiryDate": string or null
}

Field extraction instructions:
- productName: The prominent brand or trade name printed on the packaging (e.g., brand line + product variant).
- manufacturer: The entity that produced, manufactured, or packaged the product. Prioritize names following "Mfd by", "Made by", "Packed for", or corporate entities with legal designations (Ltd, PLC, Inc, GmbH). If only a distributor/brand house is listed, extract that company name.
- registrationNumber: The Nigerian regulatory identification number (NAFDAC). Look for text formatted like "NAFDAC REG NO", "NRN", "Reg No:", or alphanumeric patterns such as "A4-1234", "B4-1234", "04-1234", or "01-1234LL". Extract the full number string.
- expiryDate: Look for date stamps labeled "EXP", "EXPIRY", "BEST BEFORE", "BB", or dot-matrix printed dates. Convert to YYYY-MM-DD format. If only month and year are printed (e.g., 08/28), set the day to the last day of that month (2028-08-31).

Rules:
- Do not add markdown code fences or explanatory prose—return raw JSON only.
- If a specific field is entirely unreadable or omitted from the packaging, assign null.
- If text is legible despite slight tilt, glare, or perspective distortion, extract the characters as printed.`;

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
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              productName: { type: 'STRING', nullable: true },
              manufacturer: { type: 'STRING', nullable: true },
              registrationNumber: { type: 'STRING', nullable: true },
              expiryDate: { type: 'STRING', nullable: true },
            },
            required: [
              'productName',
              'manufacturer',
              'registrationNumber',
              'expiryDate',
            ],
          },
        },
      }),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Gemini image extraction request failed:', {
        status: res.status,
        statusText: res.statusText,
        error: errText,
        originalName: imageItem.originalName,
      });
      return null;
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return null;

    console.log('Gemini raw text output:', text);
    const cleaned = text.replace(/^```json\s*|\s*```$/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('Gemini returned invalid JSON:', {
        error: parseError.message,
        response: text,
        originalName: imageItem.originalName,
      });
      throw new Error('Gemini returned invalid extraction data.');
    }

    return normalizeExtractedFields(parsed);
  } catch (err) {
    if (err?.name === 'AbortError' || err?.name === 'TimeoutError') {
      console.error('Gemini image extraction timed out:', {
        name: err.name,
        message: err.message,
        timeoutMs: GEMINI_TIMEOUT_MS,
        originalName: imageItem.originalName,
      });
      const timeoutError = new Error(EXTRACTION_TIMEOUT_MESSAGE);
      timeoutError.code = 'EXTRACTION_TIMEOUT';
      throw timeoutError;
    }

    console.error('Gemini image extraction failed:', {
      name: err?.name,
      message: err?.message,
      originalName: imageItem.originalName,
    });
    throw err;
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
    console.error(
      'GEMINI_API_KEY is missing; image extraction cannot start.'
    );
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
      reason:
        err?.code === 'EXTRACTION_TIMEOUT'
          ? err.message
          : `Extraction failed: ${err.message}`,
    };
  }
}
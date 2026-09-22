import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_MAX_RETRIES = 2;
const GEMINI_RETRY_DELAY_MS = 1_200;

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

async function requestGemini(imageItem) {
  if (!imageItem?.buffer) return null;

  const contents = [
    {
      role: 'user',
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
  ];
  const config = {
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
  };

  const isCapacityError = (error) => {
    const status = error?.status ?? error?.statusCode;
    const message = String(error?.message || '').toLowerCase();
    return status === 503 || message.includes('experiencing high demand');
  };

  async function generateWithRetries(model) {
    for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt += 1) {
      try {
        return await ai.models.generateContent({
          model,
          contents,
          config,
        });
      } catch (error) {
        const canRetry = isCapacityError(error) && attempt < GEMINI_MAX_RETRIES;

        console.error('Gemini image extraction request failed:', {
          model,
          attempt: attempt + 1,
          status: error?.status ?? error?.statusCode,
          message: error?.message,
          retrying: canRetry,
          originalName: imageItem.originalName,
        });

        if (!canRetry) throw error;
        await new Promise((resolve) => setTimeout(resolve, GEMINI_RETRY_DELAY_MS));
      }
    }
  }

  async function parseResponse(response, model) {
    const text = response?.text?.trim();
    if (!text) {
      console.error('Gemini returned no extraction text:', {
        model,
        originalName: imageItem.originalName,
      });
      throw new Error('Gemini returned no extraction text.');
    }

    console.log('Gemini raw text output:', text);
    const parsed = JSON.parse(text);
    return normalizeExtractedFields(parsed);
  }

  try {
    const response = await generateWithRetries(GEMINI_MODEL);
    return await parseResponse(response, GEMINI_MODEL);
  } catch (primaryError) {
    console.error('Primary Gemini model failed; trying fallback model:', {
      model: GEMINI_MODEL,
      message: primaryError?.message,
      originalName: imageItem.originalName,
    });

    try {
      const response = await generateWithRetries(GEMINI_FALLBACK_MODEL);
      return await parseResponse(response, GEMINI_FALLBACK_MODEL);
    } catch (err) {
      console.error('Gemini image extraction failed; skipping image:', {
        model: GEMINI_FALLBACK_MODEL,
        name: err?.name,
        message: err?.message,
        originalName: imageItem.originalName,
      });
      return null;
    }
  }
}

/**
 * Extracts label fields from the images object passed by extractLabelController
 * @param {Object} images - { front: { buffer, mimeType }, back: { buffer, mimeType } }
 */
export async function extractLabelFields(images, deps = {}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error(
      'GEMINI_API_KEY is missing; image extraction cannot start.'
    );
    return { success: false, reason: 'Gemini API key not configured.' };
  }

  try {
    // Process front and back images in parallel
    const [frontResult, backResult] = await Promise.all([
      requestGemini(images.front),
      requestGemini(images.back),
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


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
  const generationConfig = {
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'OBJECT',
      properties: {
        productName: { type: 'STRING', nullable: true },
        manufacturer: { type: 'STRING', nullable: true },
        registrationNumber: { type: 'STRING', nullable: true },
        expiryDate: { type: 'STRING', nullable: true },
      },
      required: ['productName', 'manufacturer', 'registrationNumber', 'expiryDate'],
    },
  };

  const apiKey = process.env.GEMINI_API_KEY;
  const retryableStatus = (status) => status === 429 || status === 503 || (status >= 500 && status < 600);

  async function generateWithRetries(model) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45_000);
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({ contents, generationConfig }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          const error = new Error(`Gemini request failed (${response.status}).${errorText ? ` ${errorText.slice(0, 240)}` : ''}`);
          error.status = response.status;
          throw error;
        }
        return await response.json();
      } catch (error) {
        const status = error?.status;
        const timedOut = error?.name === 'AbortError' || error?.name === 'TimeoutError';
        const canRetry = (timedOut || retryableStatus(status)) && attempt < GEMINI_MAX_RETRIES;
        console.error('Gemini image extraction request failed:', {
          model,
          attempt: attempt + 1,
          status,
          message: error?.message,
          retrying: canRetry,
          originalName: imageItem.originalName,
        });
        if (!canRetry) throw error;
        await new Promise((resolve) => setTimeout(resolve, GEMINI_RETRY_DELAY_MS * (attempt + 1)));
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new Error('Gemini extraction retries were exhausted.');
  }

  function parseResponse(response, model) {
    const text = response?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('').trim();
    if (!text) {
      console.error('Gemini returned no extraction text:', { model, originalName: imageItem.originalName });
      throw new Error('Gemini returned no extraction text.');
    }
    const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    return normalizeExtractedFields(JSON.parse(cleaned));
  }

  try {
    return parseResponse(await generateWithRetries(GEMINI_MODEL), GEMINI_MODEL);
  } catch (primaryError) {
    console.error('Primary Gemini model failed; trying fallback model:', {
      model: GEMINI_MODEL,
      message: primaryError?.message,
      originalName: imageItem.originalName,
    });
    try {
      return parseResponse(await generateWithRetries(GEMINI_FALLBACK_MODEL), GEMINI_FALLBACK_MODEL);
    } catch (error) {
      console.error('Gemini image extraction failed; skipping image:', {
        model: GEMINI_FALLBACK_MODEL,
        name: error?.name,
        message: error?.message,
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


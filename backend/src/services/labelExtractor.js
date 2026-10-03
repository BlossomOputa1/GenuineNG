const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_MAX_RETRIES = 2;
const GEMINI_RETRY_DELAY_MS = 1_200;

export const EXTRACTION_PROMPT = `You are an OCR and packaging data extraction specialist for consumer goods and pharmaceuticals sold in Nigeria.
You are shown ONE photo of a product pack (either front or back/side panel). Transcribe ONLY what is visible in THIS photo. Never guess text from the other side.
Read all packaging text, including small print, stamps, embossing, and back-panel label details.

Return ONLY a valid JSON object with these keys:
{
  "productName": string or null,
  "manufacturer": string or null,
  "registrationNumber": string or null,
  "expiryDate": string or null
}

Field extraction instructions:
- productName: The prominent brand or trade name printed on the packaging (e.g., brand line + product variant, such as "Emzoron Blood Tonic"). Use the largest brand line visible in THIS photo. Do not combine front and back names.
- manufacturer: The entity that PRODUCED, MANUFACTURED, or PACKED the product. Strict maker hierarchy:
  1. Names following "Mfd by", "Mfg by", "Manufactured by", "Made by", "Produced by", "Packed by", "Packed for" -> extract that company name WITH its legal suffix (Ltd, Limited, Plc, PLC, Nig. Ltd, Industries, Pharmaceuticals, Laboratories, GmbH, Inc).
  2. A corporate entity with a maker legal designation in the small-print address block -> extract it.
  3. NEVER return "Marketed by", "Distributed by", "Imported by", "Sold by", brand houses, or taglines as manufacturer. If THIS photo shows only a marketer/distributor and no maker line, return null for manufacturer.
  Example: photo shows "Manufactured by Fidson Healthcare Plc" and "Distributed by XYZ Ltd" -> manufacturer is "Fidson Healthcare Plc", never XYZ.
- registrationNumber: The Nigerian regulatory identification number (NAFDAC). Look for text formatted like "NAFDAC REG NO", "NAFDAC No", "NRN", "Reg No:", or alphanumeric patterns such as "A4-1234", "B4-1234", "04-1234", or "01-1234LL". Extract the full number string exactly as printed, preserving dashes and suffix letters. Never invent digits; if partially obscured, return null.
- expiryDate: Look for date stamps labeled "EXP", "EXPIRY", "EXP. DATE", "BEST BEFORE", "BB", "Use Before", or dot-matrix/embossed printed dates. Convert to YYYY-MM-DD format. If only month and year are printed (e.g., 08/28), set the day to the last day of that month (2028-08-31). Never reuse the manufacturing date as expiry.

Rules:
- Do not add markdown code fences or explanatory prose—return raw JSON only.
- Transcribe exactly as printed. Do not expand abbreviations ("Ltd" stays "Ltd"), do not fix spelling, do not add punctuation.
- If a specific field is entirely unreadable, cropped out, or absent from THIS photo, assign null. Null is correct and preferred over a guess.
- If text is legible despite slight tilt, glare, or perspective distortion, extract the characters as printed.`;

const STRING_FIELDS = ['productName', 'manufacturer', 'registrationNumber'];

// Prefixes Gemini sometimes includes verbatim ("Mfd by X", "Marketed by Y").
// Stripped in normalization so downstream Greenbook matching sees a clean name.
const MAKER_PREFIX_PATTERN =
  /^(mfd\.?\s*by|mfg\.?\s*by|manufactured\s*by|made\s*by|produced\s*by|packed\s*(by|for))\s*[:\-–]?\s*/i;
const NON_MAKER_PREFIX_PATTERN =
  /^(marketed\s*by|distributed\s*by|imported\s*by|sold\s*by|registered\s*by)\s*[:\-–]?\s*/i;

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

function cleanStringField(key, value) {
  if (typeof value !== 'string') return null;
  let cleaned = value.replace(/\s+/g, ' ').trim();
  if (cleaned === '') return null;
  if (key === 'manufacturer') {
    // Strip a leading maker prefix Gemini may have copied ("Mfd by X" -> "X").
    cleaned = cleaned.replace(MAKER_PREFIX_PATTERN, '').trim();
    // If what remains is actually a marketer/distributor line, treat as
    // unknown maker rather than returning the wrong entity. A bare
    // "Marketed by Y" with no maker line should have been null already,
    // but this is a safety net for "Y Ltd (Marketed by ...)" style strings.
    if (NON_MAKER_PREFIX_PATTERN.test(value.trim()) && !MAKER_PREFIX_PATTERN.test(value.trim())) {
      return null;
    }
    if (cleaned === '') return null;
  }
  if (key === 'registrationNumber') {
    // Keep only the number token if Gemini added a label ("NAFDAC No: A4-1234").
    const match = cleaned.match(/[A-Z]?\d[\dA-Z-]*\d[A-Z]{0,3}/i);
    if (match && /\b(nafdac|reg|nrn|no)\b/i.test(cleaned) && match[0].length >= 4) {
      cleaned = match[0].trim();
    }
  }
  return cleaned === '' ? null : cleaned;
}

export function normalizeExtractedFields(fields = {}) {
  const normalized = {};

  for (const key of STRING_FIELDS) {
    normalized[key] = cleanStringField(key, fields[key]);
  }

  const rawExpiry = typeof fields.expiryDate === 'string' ? fields.expiryDate.trim() : null;
  normalized.expiryDate = isValidCalendarDate(rawExpiry) ? rawExpiry : null;

  return normalized;
}

// Per-field image priority. productName reads best off the front (largest
// brand line); maker/regulatory fields read best off the back/side panel
// (small print with "Mfd by", NAFDAC, expiry stamp). The old front-first
// rule let a front distributor name shadow the correct back maker name.
const MERGE_PRIORITY = {
  productName: ['front', 'back'],
  manufacturer: ['back', 'front'],
  registrationNumber: ['back', 'front'],
  expiryDate: ['back', 'front'],
};

export function mergeExtractedFields(front, back) {
  const sources = { front: front || {}, back: back || {} };
  const merged = {};
  for (const key of [...STRING_FIELDS, 'expiryDate']) {
    const [first, second] = MERGE_PRIORITY[key] || ['front', 'back'];
    merged[key] = sources[first]?.[key] ?? sources[second]?.[key] ?? null;
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
    // Low temperature + topK/topP for deterministic transcription: extraction
    // must copy print, never paraphrase. Higher values caused maker-name drift.
    temperature: 0.1,
    topK: 1,
    topP: 0.9,
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


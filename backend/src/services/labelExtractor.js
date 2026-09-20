const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const EMPTY_FIELDS = Object.freeze({
  productName: null,
  manufacturer: null,
  registrationNumber: null,
  expiryDate: null,
});

function cleanNullable(value) {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned || null;
}

function cleanExpiry(value) {
  const cleaned = cleanNullable(value);
  if (!cleaned) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return null;
  const [year, month, day] = cleaned.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return cleaned;
}

export function normalizeExtractedFields(value = {}) {
  return {
    productName: cleanNullable(value.productName),
    manufacturer: cleanNullable(value.manufacturer),
    registrationNumber: cleanNullable(value.registrationNumber),
    expiryDate: cleanExpiry(value.expiryDate),
  };
}

export function mergeExtractedFields(primary = {}, secondary = {}) {
  const first = normalizeExtractedFields(primary);
  const second = normalizeExtractedFields(secondary);
  return {
    // Front labels usually carry identity; back/side labels usually carry NRN + expiry.
    productName: first.productName || second.productName,
    manufacturer: first.manufacturer || second.manufacturer,
    registrationNumber: second.registrationNumber || first.registrationNumber,
    expiryDate: second.expiryDate || first.expiryDate,
  };
}

function parseGeminiJson(text = '') {
  const cleaned = String(text)
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');
  return normalizeExtractedFields(JSON.parse(cleaned));
}

function extractionPrompt() {
  return `You are reading ONE photo of a pharmaceutical or consumer product label sold in Nigeria.
Extract only these fields when they are actually visible and legible. If a field is not visible, use null. Never infer, guess or invent a value.

Respond with ONLY valid JSON in this exact shape:
{
  "productName": string or null,
  "manufacturer": string or null,
  "registrationNumber": string or null,
  "expiryDate": string in YYYY-MM-DD format or null
}

Rules:
- productName is the product/variant name, not a slogan.
- manufacturer is the company that manufactures/produces the product, not merely the largest brand text.
- registrationNumber is the NAFDAC registration number, often labelled NAFDAC Reg. No., NAFDAC No., NRN or similar.
- expiryDate may appear in formats such as 12/2027, DEC 2027, 27/12/2027, EXP 12/27. Convert it to YYYY-MM-DD. If only month/year is visible, use the final calendar day of that month.
- If text is blurry, cropped or ambiguous, return null for that field rather than guessing.`;
}

async function extractOne(file, apiKey, signal) {
  if (!file?.buffer?.length) return { ok: false, fields: EMPTY_FIELDS };

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: extractionPrompt() },
            {
              inline_data: {
                mime_type: file.mimeType,
                data: file.buffer.toString('base64'),
              },
            },
          ],
        }],
      }),
      signal,
    });

    if (!response.ok) {
      return { ok: false, fields: EMPTY_FIELDS, reason: `Gemini request failed (${response.status}).` };
    }

    const payload = await response.json();
    const text = payload.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    if (!text) return { ok: false, fields: EMPTY_FIELDS, reason: 'Gemini returned no extraction text.' };

    return { ok: true, fields: parseGeminiJson(text) };
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    return { ok: false, fields: EMPTY_FIELDS, reason: error?.message || 'Gemini extraction failed.' };
  }
}

export async function extractLabelFields(images = {}, { signal } = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      status: 'extraction_unavailable',
      fields: { ...EMPTY_FIELDS },
      reason: 'Gemini API key is not configured.',
    };
  }

  const [front, back] = await Promise.all([
    images.front ? extractOne(images.front, apiKey, signal) : Promise.resolve({ ok: false, fields: EMPTY_FIELDS }),
    images.back ? extractOne(images.back, apiKey, signal) : Promise.resolve({ ok: false, fields: EMPTY_FIELDS }),
  ]);

  const fields = mergeExtractedFields(front.fields, back.fields);
  const hasAnyField = Object.values(fields).some(Boolean);

  if (!hasAnyField) {
    return {
      status: 'extraction_unavailable',
      fields,
      reason: front.reason || back.reason || 'No readable label details were extracted.',
    };
  }

  return { status: 'completed', fields };
}

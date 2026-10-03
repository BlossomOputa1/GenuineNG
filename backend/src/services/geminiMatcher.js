const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_TIMEOUT_MS = 45_000;

export const IDENTITY_MATCH_PROMPT_VERSION = '2026-10-03-ma-holder-v1';

export function buildIdentityPrompt(extracted = {}, record = {}) {
  return `You compare product label data for a Nigerian drug verification system.
The PRODUCT NAME is the primary identity. Decide matches:true when the core brand tokens agree, IGNORING formal Greenbook suffixes (dosage form, strength, pack size, punctuation such as **, quotes, #), case differences, and OCR noise. Examples: "LONART - DS" vs "Lonart-DS Tablets**" is the SAME product. "Emzoron" vs "EMZORON BLOOD TONIC 200ML" is the SAME product.
Tolerate abbreviations ("Ltd" vs "Limited" vs "PLC"), and minor spelling variation. A blank extracted field means that field is unknown: IGNORE it completely and compare only extracted fields that are present.

Nigerian authorization-holder rule (critical): for imported drugs the pack prints the FOREIGN FACTORY after "Manufactured by" while the Greenbook record lists the NIGERIAN authorization holder/distributor. A factory-vs-holder manufacturer difference with an agreeing product name is EXPECTED and must return matches:true — explain the difference in reason (e.g. "manufacturers conflict: photo indicates factory X while the reference lists holder Y; product name agrees").
Example: product "LONART-DS" vs "Lonart-DS Tablets**" with maker "BLISS GVS PHARMA LTD." vs "Greenlife Pharmaceutical Limited" -> {"matches": true, "reason": "product name agrees; manufacturers conflict: photo indicates factory 'BLISS GVS PHARMA LTD.' while the reference lists holder 'Greenlife Pharmaceutical Limited'"}.

Return matches:false ONLY when the core product names genuinely conflict (different brand, e.g. "Different Product" vs "GenuineNG Sample Food A"). Do NOT be lenient then.

Extracted from photo: product name = "${extracted.productName || ''}", manufacturer = "${extracted.manufacturer || ''}"
Reference record: product name = "${record.productName || ''}", manufacturer = "${record.manufacturer || ''}"

Respond with ONLY a JSON object, no other text: {"matches": true or false, "reason": "brief explanation"}`;
}

/**
 * Asks Gemini whether two (productName, manufacturer) pairs plausibly
 * refer to the same product — tolerant of OCR noise, abbreviations,
 * "Ltd" vs "Limited", minor spelling differences.
 * Product NAME is the primary identity. A manufacturer-only difference
 * (factory on pack vs authorization holder on record) must still return
 * matches:true with the difference explained in reason — the caller turns
 * that into a match-with-note, never a warning.
 * Fails closed for genuine name conflicts; errors return matches:null.
 */
export async function compareProductIdentity(extracted, record) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error(
      'GEMINI_API_KEY is missing; identity comparison cannot start.'
    );
    return {
      matches: null,
      reason: 'Gemini API key not configured; identity comparison skipped.',
    };
  }

  const prompt = buildIdentityPrompt(extracted, record);

  const generationConfig = {
    temperature: 0,
    topK: 1,
    topP: 0.9,
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'OBJECT',
      properties: {
        matches: { type: 'BOOLEAN' },
        reason: { type: 'STRING', nullable: true },
      },
      required: ['matches'],
    },
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        console.error(`Gemini identity request failed (${res.status}):`, errorText);
        return {
          matches: null,
          reason: `Gemini request failed (${res.status}).`,
        };
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      const cleaned = text?.replace(/^```json\s*|\s*```$/g, '');
      const parsed = JSON.parse(cleaned);

      if (typeof parsed.matches !== 'boolean') {
        return {
          matches: null,
          reason: 'Gemini returned an unexpected response shape.',
        };
      }

      return { matches: parsed.matches, reason: parsed.reason || '' };
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    if (err?.name === 'AbortError' || err?.name === 'TimeoutError') {
      console.error('Gemini identity comparison timed out:', {
        name: err.name,
        message: err.message,
        timeoutMs: GEMINI_TIMEOUT_MS,
      });
      return {
        matches: null,
        reason: 'Identity comparison timed out; verification continued without it.',
      };
    }
    console.error('Gemini identity comparison failed:', err);
    return {
      matches: null,
      reason: `Identity comparison unavailable: ${err.message}`,
    };
  }
}

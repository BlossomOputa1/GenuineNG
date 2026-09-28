const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_TIMEOUT_MS = 45_000;

/**
 * Asks Gemini whether two (productName, manufacturer) pairs plausibly
 * refer to the same product — tolerant of OCR noise, abbreviations,
 * "Ltd" vs "Limited", minor spelling differences.
 * Fails closed: any error or ambiguous response returns matches:false
 * with a flagged reason, never a silent true.
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

  const prompt = `You compare product label data for a Nigerian drug verification system.
Given two records, decide if they plausibly describe the SAME product, tolerating OCR noise,
abbreviations (e.g. "Ltd" vs "Limited"), and minor spelling variation. A blank extracted field means
that field is unknown: IGNORE it completely and compare only extracted fields that are present. Do NOT
be lenient when a provided product name or manufacturer genuinely conflicts with the reference record.

Extracted from photo: product name = "${extracted.productName || ''}", manufacturer = "${extracted.manufacturer || ''}"
Reference record: product name = "${record.productName || ''}", manufacturer = "${record.manufacturer || ''}"

Respond with ONLY a JSON object, no other text: {"matches": true or false, "reason": "brief explanation"}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
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

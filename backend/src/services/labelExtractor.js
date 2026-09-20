const GEMINI_MODEL = 'gemini-3.5-flash-lite';
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
  followed by a legal suffix (Ltd, PLC, GmbH, AG, Inc, Limited, Co). This is usually printed in smaller
  text on the back/side of the pack, often near the registration number or address.
  Example: if the front says "NIVEA" in large letters but the back says "Manufactured by Beiersdorf AG",
  the manufacturer is "Beiersdorf AG", NOT "Nivea" — Nivea is a brand, not the manufacturing company.
  If no distinct manufacturer company name is printed anywhere and only a brand name exists, use that
  brand name as a last resort, but prefer a real company name whenever one is visible.
- registrationNumber: the NAFDAC registration number, usually printed as "NAFDAC Reg. No." or similar.
- expiryDate: may be printed in many formats (e.g. "12/2027", "DEC 2027", "27/12/2027") — convert it to
  YYYY-MM-DD. If only month/year is printed, use the last day of that month.

Do not infer or guess a field that isn't legible in the photo.`;

/**
 * Sends one photo to Gemini and returns extracted fields. Fails closed —
 * any error returns a result with success:false rather than throwing,
 * so the controller can respond gracefully instead of 500ing.
 */
export async function extractLabelFields(imageBuffer, mimeType, deps = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  const fetchFn = deps.fetch || fetch;

  if (!apiKey) {
    return { success: false, reason: 'Gemini API key not configured.' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetchFn(GEMINI_URL, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: EXTRACTION_PROMPT },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBuffer.toString('base64'),
                },
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        success: false,
        reason: `Gemini request failed (${res.status}).`,
      };
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    const cleaned = text?.replace(/^```json\s*|\s*```$/g, '');
    const parsed = JSON.parse(cleaned);

    return {
      success: true,
      fields: {
        productName: parsed.productName ?? null,
        manufacturer: parsed.manufacturer ?? null,
        registrationNumber: parsed.registrationNumber ?? null,
        expiryDate: parsed.expiryDate ?? null,
      },
    };
  } catch (err) {
    return { success: false, reason: `Extraction failed: ${err.message}` };
  }
}

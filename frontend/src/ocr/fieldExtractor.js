function clean(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return clean(match[1]);
  }
  return '';
}

function linesFrom(text = '') {
  return String(text)
    .split(/\r?\n/)
    .map(line => clean(line))
    .filter(Boolean);
}

function guessProductName(text) {
  const lines = linesFrom(text);
  const banned = /^(ingredients?|manufactured|manufacturer|batch|lot|expiry|exp\b|nafdac|nrn|registration|keep|store|warning|directions?)/i;
  const candidate = lines.find(line => line.length >= 3 && line.length <= 80 && !banned.test(line));
  return candidate || '';
}

function extractIngredients(text) {
  const lines = linesFrom(text);
  const index = lines.findIndex(line => /^ingredients?\b/i.test(line));
  if (index < 0) return '';
  const first = lines[index].replace(/^ingredients?\s*[:\-]?\s*/i, '');
  const following = [];
  for (let i = index + 1; i < Math.min(lines.length, index + 5); i += 1) {
    if (/^(batch|lot|expiry|exp\b|nafdac|nrn|registration|manufactured|manufacturer|storage|directions?|warning)/i.test(lines[i])) break;
    following.push(lines[i]);
  }
  return clean([first, ...following].filter(Boolean).join(', '));
}

export function extractFieldsFromOcr(frontText = '', backText = '') {
  const combined = `${frontText}\n${backText}`;
  const productName = guessProductName(frontText) || guessProductName(combined);
  const manufacturer = firstMatch(combined, [
    /(?:manufactured\s+by|manufacturer|manufactured\s+for|made\s+by|produced\s+by)\s*[:\-]?\s*([^\n]{3,100})/i,
  ]);
  const registrationNumber = firstMatch(combined, [
    /(?:NAFDAC\s*(?:REG(?:ISTRATION)?\.?\s*(?:NO\.?|NUMBER)?|NO\.?)|NRN)\s*[:#\-]?\s*([A-Z0-9][A-Z0-9/\.\-]{3,30})/i,
  ]);
  const batchNumber = firstMatch(combined, [
    /(?:BATCH(?:\s*(?:NO\.?|NUMBER))?|LOT(?:\s*(?:NO\.?|NUMBER))?)\s*[:#\-]?\s*([A-Z0-9][A-Z0-9/\.\-]{2,40})/i,
  ]);
  const expiryDate = firstMatch(combined, [
    /(?:EXP(?:IRY|IRES)?(?:\s*DATE)?|BEST\s*BEFORE|BB)\s*[:#\-]?\s*([0-9]{1,2}[\/\.\-][0-9]{2,4}|20[0-9]{2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{1,2})/i,
  ]);
  const ingredients = extractIngredients(combined);

  return { productName, manufacturer, registrationNumber, batchNumber, expiryDate, ingredients };
}

export function hasRequiredIdentityFields(fields = {}) {
  return ['registrationNumber', 'productName', 'manufacturer']
    .every(key => clean(fields[key]).length > 0);
}

export function hasEnoughOcrSignal({ fields = {} }) {
  // GenuineNG only proceeds automatically when OCR captured the three identity
  // fields needed for a meaningful product lookup/cross-check.
  return hasRequiredIdentityFields(fields);
}

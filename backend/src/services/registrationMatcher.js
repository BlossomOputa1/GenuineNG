import { findByRegistrationNumber, getDatasetInfo } from './referenceData.js';
import { compareProductIdentity } from './geminiMatcher.js';

// Dosage-form / pack-size tokens stripped before comparing product names.
// Greenbook names are formal ("Lonart-DS Tablets**", '"DR BROWN\'S" ADULT
// DIAPER (LARGE)'), packs print the short brand ("LONART - DS"). These tokens
// never identify the product, so they must not cause a mismatch.
const NAME_STOPWORDS = new Set([
  'tablet', 'tablets', 'capsule', 'capsules', 'caplet', 'caplets',
  'syrup', 'suspension', 'drops', 'drop', 'injection', 'injectable',
  'cream', 'ointment', 'gel', 'lotion', 'powder', 'granules', 'sachet',
  'sachets', 'vial', 'ampoule', 'spray', 'solution', 'suppository',
  'mg', 'g', 'ml', 'l', 'mcg', 'ug', 'iu',
]);

export function normalizeProductTokens(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token && !NAME_STOPWORDS.has(token));
}

// Identity rule (mirrors real verification practice: reg number + product
// name identify the product; the Greenbook "manufacturer" column often holds
// the Nigerian authorization holder, not the foreign factory, so a maker-only
// difference must never warn). Names agree when every token of the shorter
// core name appears in the longer one: "lonart ds" vs "lonart ds tablets".
export function productNamesAgree(extractedName = '', recordName = '') {
  const extracted = normalizeProductTokens(extractedName);
  const record = normalizeProductTokens(recordName);
  if (extracted.length === 0 || record.length === 0) return false;
  const [shorter, longer] =
    extracted.length <= record.length ? [extracted, record] : [record, extracted];
  const longerSet = new Set(longer);
  return shorter.every((token) => longerSet.has(token));
}

export async function checkRegistration(
  { registrationNumber, productName, manufacturer },
  now = new Date(),
  deps = {}
) {
  const findRecord = deps.findRecord || findByRegistrationNumber;
  const compareIdentity = deps.compareIdentity || compareProductIdentity;
  const datasetInfo = deps.getDatasetInfo || getDatasetInfo;

  if (!registrationNumber || registrationNumber.trim() === '') {
    return {
      status: 'not_checked',
      reason: 'No registration number provided.',
      checkedAt: now.toISOString(),
    };
  }

  const { generatedAt } = datasetInfo();
  const record = findRecord(registrationNumber.trim());

  if (!record) {
    return {
      status: 'unverified',
      reason: 'No matching registration record found. Unverified does not mean fake.',
      source: `nafdac-greenbook-export (as of ${generatedAt})`,
      checkedAt: now.toISOString(),
    };
  }

  const hasProductName = Boolean(productName?.trim());
  const hasManufacturer = Boolean(manufacturer?.trim());

  if (!hasProductName && !hasManufacturer) {
    return {
      status: 'match',
      reason: `Registration number is on record for “${record.productName}” by ${record.manufacturer}. No product identity fields were provided to cross-check.`,
      source: `nafdac-greenbook-export (as of ${generatedAt})`,
      checkedAt: now.toISOString(),
    };
  }

  const trimmedName = hasProductName ? productName.trim() : '';
  const trimmedMaker = hasManufacturer ? manufacturer.trim() : '';
  const localNameAgrees = hasProductName
    ? productNamesAgree(trimmedName, record.productName || '')
    : false;

  // Fast path: the printed core brand already matches the record's core
  // brand and no maker was supplied — no need to call the LLM at all.
  if (localNameAgrees && !hasManufacturer) {
    return {
      status: 'match',
      reason: `Registered to ${record.manufacturer} as “${record.productName}”. The provided product name matched the registration record.`,
      source: `nafdac-greenbook-export (as of ${generatedAt})`,
      checkedAt: now.toISOString(),
    };
  }

  const identity = await compareIdentity(
    { productName: trimmedName, manufacturer: trimmedMaker },
    { productName: record.productName, manufacturer: record.manufacturer }
  );

  if (identity.matches === false) {
    // Maker-only conflict with an agreeing product name: the pack shows the
    // factory (e.g. BLISS GVS PHARMA LTD.) while Greenbook lists the Nigerian
    // authorization holder (e.g. Greenlife Pharmaceutical Limited). This is
    // expected for imports — a match with an explanatory note, not a warning.
    if (localNameAgrees) {
      return {
        status: 'match',
        reason: `Registered to ${record.manufacturer} as “${record.productName}”. The product name matched the registration record. Printed pack shows made by ${trimmedMaker}; ${record.manufacturer} is the authorization holder on record. ${identity.reason}`.trim(),
        source: `nafdac-greenbook-export (as of ${generatedAt})`,
        checkedAt: now.toISOString(),
      };
    }
    return {
      status: 'warning',
      reason: `This registration number is on record for “${record.productName}” by ${record.manufacturer}, but the provided label details do not match that record. ${identity.reason}`.trim(),
      source: `nafdac-greenbook-export (as of ${generatedAt})`,
      checkedAt: now.toISOString(),
    };
  }

  if (identity.matches === null) {
    return {
      status: 'match',
      reason: `Registration number is on record for “${record.productName}” by ${record.manufacturer}. Identity cross-check was unavailable: ${identity.reason}`,
      source: `nafdac-greenbook-export (as of ${generatedAt})`,
      checkedAt: now.toISOString(),
    };
  }

  const compared = [hasProductName ? 'product name' : null, hasManufacturer ? 'manufacturer' : null]
    .filter(Boolean)
    .join(' and ');

  return {
    status: 'match',
    reason: `Registered to ${record.manufacturer} as “${record.productName}”. The provided ${compared} matched the registration record.`,
    source: `nafdac-greenbook-export (as of ${generatedAt})`,
    checkedAt: now.toISOString(),
  };
}

import { findByRegistrationNumber, getDatasetInfo } from './referenceData.js';
import { compareProductIdentity } from './geminiMatcher.js';

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

  const identity = await compareIdentity(
    {
      productName: hasProductName ? productName.trim() : '',
      manufacturer: hasManufacturer ? manufacturer.trim() : '',
    },
    { productName: record.productName, manufacturer: record.manufacturer }
  );

  if (identity.matches === false) {
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

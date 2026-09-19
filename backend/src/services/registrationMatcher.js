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
      reason: 'No matching registration record found.',
      source: `nafdac-greenbook-export (as of ${generatedAt})`,
      checkedAt: now.toISOString(),
    };
  }

  if (!productName || productName.trim() === '') {
    return {
      status: 'match',
      reason: `Registration number is on record for ${record.manufacturer}. Product name wasn't provided, so name/manufacturer identity wasn't cross-checked.`,
      source: `nafdac-greenbook-export (as of ${generatedAt})`,
      checkedAt: now.toISOString(),
    };
  }

  const identity = await compareIdentity(
    { productName, manufacturer },
    { productName: record.productName, manufacturer: record.manufacturer }
  );

  if (identity.matches === false) {
    return {
      status: 'warning',
      reason: `This registration number is on record, but for a different product: "${record.productName}" (${record.manufacturer}). ${identity.reason}`,
      source: `nafdac-greenbook-export (as of ${generatedAt})`,
      checkedAt: now.toISOString(),
    };
  }

  if (identity.matches === null) {
    return {
      status: 'match',
      reason: `Registration number matches. Product/manufacturer identity check unavailable: ${identity.reason}`,
      source: `nafdac-greenbook-export (as of ${generatedAt})`,
      checkedAt: now.toISOString(),
    };
  }

  return {
    status: 'match',
    reason: `Registered to ${record.manufacturer} as "${record.productName}".`,
    source: `nafdac-greenbook-export (as of ${generatedAt})`,
    checkedAt: now.toISOString(),
  };
}

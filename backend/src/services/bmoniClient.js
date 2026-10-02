const SANDBOX_ORIGIN = 'https://embedded-dev.bmoni.com';

export function sandboxBillingEnabled() {
  return process.env.BMONI_BILLING_ENABLED === 'true' && process.env.BMONI_ENV === 'sandbox';
}

export function assertSandboxReady() {
  if (!sandboxBillingEnabled()) {
    const error = new Error('Sandbox billing is not enabled.');
    error.statusCode = 503;
    error.code = 'BILLING_DISABLED';
    throw error;
  }
  const origin = (process.env.BMONI_BASE_URL || SANDBOX_ORIGIN).replace(/\/+$/, '');
  if (origin !== SANDBOX_ORIGIN || !process.env.BMONI_API_KEY ||
      !process.env.BMONI_WEBHOOK_SECRET || !process.env.BMONI_USER_ID) {
    const error = new Error('Sandbox BMONI account or server credentials are incomplete.');
    error.statusCode = 503;
    error.code = 'BILLING_NOT_CONFIGURED';
    throw error;
  }
  return origin;
}

export async function getSandboxDepositAccount() {
  const origin = assertSandboxReady();
  const response = await fetch(
    `${origin}/v1/users/${encodeURIComponent(process.env.BMONI_USER_ID)}/bank-accounts/deposit-accounts/NGN`,
    { headers: { 'x-api-key': process.env.BMONI_API_KEY }, signal: AbortSignal.timeout(10000) },
  );
  if (!response.ok) {
    const error = new Error('Could not load the BMONI sandbox deposit account.');
    error.statusCode = 502;
    error.code = 'BMONI_ACCOUNT_UNAVAILABLE';
    throw error;
  }
  const body = await response.json();
  const data = body?.data || body;
  const candidates = Array.isArray(data) ? data : Array.isArray(data?.accounts) ? data.accounts : [data];
  const accounts = candidates.filter((item) => item && (item.accountNumber || item.account_number));
  if (accounts.length !== 1) {
    const error = new Error('BMONI did not return one identifiable sandbox deposit account.');
    error.statusCode = 502;
    error.code = 'BMONI_ACCOUNT_UNAVAILABLE';
    throw error;
  }
  const item = accounts[0];
  const accountNumber = String(item.accountNumber || item.account_number);
  const bankName = item.bankName || item.bank_name;
  const accountName = item.accountName || item.account_name || item.accountHolderName;
  if (!/^\d{10}$/.test(accountNumber) || !bankName || !accountName) {
    const error = new Error('BMONI sandbox deposit account details are incomplete.');
    error.statusCode = 502;
    error.code = 'BMONI_ACCOUNT_UNAVAILABLE';
    throw error;
  }
  return { accountNumber, bankName, accountName };
}

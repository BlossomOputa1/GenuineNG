// backend/test-bmoni-wallet.js
import 'dotenv/config';
import bmoniClient from './src/services/bmoniClient.js';

async function testWalletAndVba() {
  const userId = process.env.BMONI_USER_ID;
  console.log('====================================================');
  console.log('Testing BMoni User, Smart Wallet & VBA Provisioning');
  console.log('User ID:', userId);
  console.log('====================================================\n');

  if (!userId) {
    console.error('Error: BMONI_USER_ID is missing from .env');
    process.exit(1);
  }

  let smartWalletId = null;

  // 1. Fetch user details or smart wallet
  console.log('[1/3] Fetching user details and smart wallet status...');
  try {
    const userRes = await bmoniClient.get(`/v1/users/${userId}`);
    console.log('User details retrieved:');
    console.dir(userRes.data, { depth: null });

    smartWalletId =
      userRes.data?.smartWallet?.id ||
      userRes.data?.smartWalletId ||
      userRes.data?.data?.smartWallet?.id ||
      userRes.data?.data?.smartWalletId;
  } catch (err) {
    console.log(`GET /v1/users/${userId} check:`, err.response?.status, err.response?.data?.message || err.message);
  }

  // 2. If no smart wallet attached, try querying or creating one
  if (!smartWalletId) {
    console.log('\n[2/3] Checking / Creating smart wallet for user...');
    try {
      // First try listing wallets for the user
      const listRes = await bmoniClient.get(`/v1/smart-wallets?userId=${userId}`);
      const wallets = listRes.data?.wallets || listRes.data?.data || listRes.data;
      if (Array.isArray(wallets) && wallets.length > 0) {
        smartWalletId = wallets[0].id;
        console.log(`Found existing smart wallet: ${smartWalletId}`);
      }
    } catch {
      // Endpoint might not support listing by query param
    }

    if (!smartWalletId) {
      try {
        const createWalletRes = await bmoniClient.post('/v1/smart-wallets', {
          userId: userId,
        });
        console.log('Smart wallet created successfully:');
        console.dir(createWalletRes.data, { depth: null });
        smartWalletId = createWalletRes.data?.id || createWalletRes.data?.data?.id;
      } catch (err) {
        console.log('Create smart wallet response:', err.response?.status, err.response?.data);
      }
    }
  } else {
    console.log(`\n[2/3] Existing smart wallet detected: ${smartWalletId}`);
  }

  // 3. Test dynamic Nigerian VBA provisioning
  if (smartWalletId) {
    console.log(`\n[3/3] Requesting dynamic Nigerian VBA for smart wallet: ${smartWalletId}...`);
    try {
      const vbaRes = await bmoniClient.post(`/v1/smart-wallets/${smartWalletId}/onramp/vba/nigeria`, {
        amount: 50000,
        currency: 'NGN',
      });
      console.log('\nVBA Provisioning Succeeded!');
      console.dir(vbaRes.data, { depth: null });
      console.log('\nAccount Details for Inbound Funding:');
      console.log('Bank Name:', vbaRes.data?.bankName || vbaRes.data?.data?.bankName);
      console.log('Account Number:', vbaRes.data?.accountNumber || vbaRes.data?.data?.accountNumber);
      console.log('Account Name:', vbaRes.data?.accountName || vbaRes.data?.data?.accountName);
    } catch (err) {
      console.error('Failed to provision VBA:');
      console.error(err.response?.status, err.response?.data || err.message);
    }
  } else {
    console.warn('\nSkipping VBA provisioning: could not resolve smartWalletId.');
  }
}

testWalletAndVba().catch(console.error);
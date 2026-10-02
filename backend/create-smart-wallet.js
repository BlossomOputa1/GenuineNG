// backend/create-smart-wallet.js
import 'dotenv/config';
import bmoniClient from './src/services/bmoniClient.js';
import { privateKeyToAccount } from 'viem/accounts';

async function provisionSmartWalletAndVba() {
  const userId = process.env.BMONI_USER_ID || 'd4dc9729-85f9-4946-aa8d-b260b8eef5c8';
  const rawKey = process.env.BMONI_SECP256K1_PRIVATE_KEY;
  const privateKey = rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`;
  const account = privateKeyToAccount(privateKey);

  console.log('======================================================');
  console.log('Provisioning BMoni Smart Wallet & Nigerian VBA');
  console.log('User ID:', userId);
  console.log('Owner Address:', account.address);
  console.log('======================================================\n');

  // Step 1: Request Owner Proof Challenge
  console.log('[1/3] Requesting owner proof challenge...');
  const challengeRes = await bmoniClient.post(`/v1/users/${userId}/smart-wallets/owner-proof-challenges`, {
    userOwnerAddress: account.address,
    currency: 'CNGN',
  });

  const { challengeId, message } = challengeRes.data;
  console.log('Challenge received:', challengeId);

  // Step 2: Sign Challenge Message
  console.log('\n[2/3] Signing challenge message...');
  const ownerProofSignature = await account.signMessage({ message });
  console.log('Signature generated:', ownerProofSignature);

  // Step 3: Create Managed Smart Wallet
  console.log('\n[3/3] Creating managed smart wallet...');
  const createPayload = {
    currency: 'CNGN',
    userOwnerAddress: account.address,
    ownerProofChallengeId: challengeId,
    ownerProofSignature,
  };

  const walletRes = await bmoniClient.post(`/v1/users/${userId}/smart-wallets/create-managed`, createPayload);
  console.log('\n🎉 SMART WALLET CREATED SUCCESSFULLY!');
  console.dir(walletRes.data, { depth: null });

  const smartWalletId = walletRes.data?.id || walletRes.data?.smartWalletId || walletRes.data?.data?.id;

  // Step 4: Provision Nigerian Virtual Bank Account (VBA)
  if (smartWalletId) {
    console.log(`\n--- Provisioning Nigerian VBA for Smart Wallet: ${smartWalletId} ---`);
    try {
      const vbaRes = await bmoniClient.post(`/v1/users/${userId}/smart-wallets/${smartWalletId}/onramp/vba/nigeria`, {
        amount: 50000,
        currency: 'NGN',
      });

      console.log('\n======================================================');
      console.log('🎉 NIGERIAN VIRTUAL BANK ACCOUNT READY!');
      console.log('======================================================');
      console.dir(vbaRes.data, { depth: null });
    } catch (vbaErr) {
      console.error('VBA Provisioning Failed:', vbaErr.response?.status, vbaErr.response?.data || vbaErr.message);
    }
  }
}

provisionSmartWalletAndVba().catch((err) => {
  console.error('\nExecution error:');
  if (err.response) {
    console.error('Status:', err.response.status);
    console.error('Data:', JSON.stringify(err.response.data, null, 2));
  } else {
    console.error(err.message);
  }
});
// backend/run-clean-flow.js
import 'dotenv/config';
import bmoniClient from './src/services/bmoniClient.js';
import { privateKeyToAccount } from 'viem/accounts';

async function main() {
  const rawKey = process.env.BMONI_SECP256K1_PRIVATE_KEY;
  const privateKey = rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`;
  const account = privateKeyToAccount(privateKey);
  const ts = Date.now();

  console.log('========================================================');
  console.log('Provisioning Persona: Samson Jabo');
  console.log('Signer address:', account.address);
  console.log('========================================================\n');

  // 1. Create User matching Samson Jabo persona
  console.log('--- 1. Creating Samson Jabo user ---');
  const userRes = await bmoniClient.post('/v1/users', {
    firstName: 'Samson',
    lastName: 'Jabo',
    email: `samson.jabo.${ts}@example.com`,
    phoneNumber: '+2348000000001',
  });

  const userData = userRes.data?.user || userRes.data;
  const userId = userData?.bmoniUserId || userData?.id;
  console.log('User created successfully. User ID:', userId);

  // 2. Request challenge & Deploy CNGN Smart Wallet
  console.log('\n--- 2. Deploying CNGN Smart Wallet ---');
  const chal = await bmoniClient.post(`/v1/users/${userId}/smart-wallets/owner-proof-challenges`, {
    userOwnerAddress: account.address,
    currency: 'CNGN',
  });

  const signature = await account.signMessage({ message: chal.data.message });

  const wallet = await bmoniClient.post(`/v1/users/${userId}/smart-wallets/create-managed`, {
    currency: 'CNGN',
    userOwnerAddress: account.address,
    ownerProofChallengeId: chal.data.challengeId,
    ownerProofSignature: signature,
  });

  const walletAddress = wallet.data.walletAddress;
  console.log('Smart Wallet ready. Address:', walletAddress);

  // 3. Initiate Nigeria Onboarding with matching BVN
  console.log('\n--- 3. Starting Nigeria onboarding (BVN: 22222222222) ---');
  const ob = await bmoniClient.post(`/v1/users/${userId}/onboarding/start-nigeria`, {
    bvn: '22222222222',
    ngnWalletAddress: walletAddress,
    ngnWalletIndex: 0,
  });

  const workflowId = ob.data.workflowId;
  console.log('Workflow queued:', workflowId);

  // 4. Poll Workflow Status
  console.log('\n--- 4. Polling for Nigerian Virtual Bank Account ---');
  for (let i = 1; i <= 8; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const wf = await bmoniClient.get(`/v1/users/${userId}/wallets/workflows/${workflowId}`);
    console.log(`Poll #${i}: Status = ${wf.data.status}`);

    if (wf.data.status === 'COMPLETED') {
      const banks = await bmoniClient.get(`/v1/users/${userId}/bank-accounts/deposit-accounts/NGN`);
      console.log('\n======================================================');
      console.log('🎉 DEDICATED NIGERIAN VBA PROVISIONED!');
      console.log('======================================================');
      console.dir(banks.data, { depth: null });
      return;
    }

    if (wf.data.status === 'FAILED') {
      console.error('\nWorkflow failed:', wf.data);
      return;
    }
  }
}

main().catch((err) => {
  console.error('Error occurred:', err.response?.data || err.message);
});
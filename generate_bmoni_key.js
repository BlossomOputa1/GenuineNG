// generate-key.js
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

// Generate a random 32-byte secp256k1 private key
const privateKey = generatePrivateKey();

// Derive the Ethereum account (public address)
const account = privateKeyToAccount(privateKey);

console.log('--- BMoni secp256k1 Key Pair ---');
console.log('Private Key (BMONI_SECP256K1_PRIVATE_KEY):', privateKey);
console.log('Public Address (Owner/Signer Address):  ', account.address);
console.log('--------------------------------');
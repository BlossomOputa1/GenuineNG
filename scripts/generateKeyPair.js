// One-off setup script. NOT part of the app runtime — keyManager.js only
// ever reads the private key from env, it never generates one.
// Run manually once (or again if rotating keys): node scripts/generateKeyPair.js

import { generateKeyPairSync } from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');

const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const publicPem = publicKey.export({ type: 'spki', format: 'pem' });

// Collapse real newlines into literal \n so this is safe to paste
// directly as a single .env line, quotes included.
const toEnvLine = (pem) => pem.trim().split('\n').join('\\n');

console.log('--- paste this exact line into backend/.env ---');
console.log(`GENUINENG_ED25519_PRIVATE_KEY="${toEnvLine(privatePem)}"`);

console.log('\n--- paste this exact line into frontend/.env ---');
console.log(`VITE_GENUINENG_PUBLIC_KEY="${toEnvLine(publicPem)}"`);

console.log('\n--- also paste this same value into backend/.env ---');
console.log(`GENUINENG_ED25519_PUBLIC_KEY="${toEnvLine(publicPem)}"`);

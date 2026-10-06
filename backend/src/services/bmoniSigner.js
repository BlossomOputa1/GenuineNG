// services/bmoniSigner.js
import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";

const privateKey = process.env.BMONI_SECP256K1_PRIVATE_KEY;
if (!privateKey) {
  throw new Error("BMONI_SECP256K1_PRIVATE_KEY must be configured.");
}

const account = privateKeyToAccount(privateKey);

/**
 * Signs a raw 32-byte hash digest from BMoni for payout proposals.
 * @param {`0x${string}`} digestHex - Raw hash digest from /sign-payload endpoint
 * @returns {Promise<`0x${string}`>} 65-byte ECDSA signature
 */
export async function signProposalDigest(digestHex) {
  // BMoni proposal verification expects raw digest signing, NOT EIP-191 prefixed personal_sign
  const signature = await account.sign({
    hash: digestHex,
  });
  return signature;
}

export const serverOwnerAddress = account.address;

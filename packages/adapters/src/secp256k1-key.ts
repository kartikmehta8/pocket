/**
 * Recovering a wallet's public key from a signature.
 *
 * Hedera identifies an account by a public key, but a custodial provider only
 * hands out the address — the key is hashed into it and cannot be read back.
 * The mirror node publishes the key once the account signs something, which is
 * too late: the first transaction is exactly the one that needs it.
 *
 * A signature closes the gap. Every secp256k1 signature carries a recovery
 * byte, so signing any known digest yields the public key that produced it,
 * without the key ever leaving the provider and without touching the chain.
 */

import { computeAddress, keccak256, SigningKey, toUtf8Bytes } from 'ethers';
import { PocketError } from '@pocket/core';

/**
 * The digest wallets sign to reveal their public key.
 *
 * @remarks A fixed, human-readable, domain-separated string rather than a
 * random value, so the same wallet always answers identically and the
 * signature can never be mistaken for one over a real transaction: no valid
 * Hedera or EVM payload hashes to this.
 */
export const KEY_DISCOVERY_DIGEST = keccak256(
  toUtf8Bytes('pocket:key-discovery:v1'),
) as `0x${string}`;

/**
 * Recovers the compressed public key behind an address.
 *
 * @param digest - The 32-byte digest that was signed.
 * @param signature - The `0x`-prefixed 65-byte signature over it.
 * @param expectedAddress - The address the key must hash to.
 * @returns The `0x`-prefixed 33-byte compressed public key.
 * @throws {PocketError} `VALIDATION_FAILED` when the signature does not recover
 *   to the expected address, which means the provider signed with a different
 *   key than the one the wallet claims to hold. Paying on the strength of an
 *   unchecked key would put funds behind a signer nobody verified.
 */
export function recoverCompressedPublicKey(
  digest: string,
  signature: string,
  expectedAddress: string,
): string {
  let uncompressed: string;
  try {
    uncompressed = SigningKey.recoverPublicKey(digest, signature);
  } catch (cause) {
    throw new PocketError(
      'VALIDATION_FAILED',
      'The wallet returned a signature no public key could be recovered from.',
      { expectedAddress },
      cause,
    );
  }

  const derived = computeAddress(uncompressed);
  if (derived.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new PocketError(
      'VALIDATION_FAILED',
      'The recovered public key does not match the wallet address.',
      { expectedAddress, derivedAddress: derived },
    );
  }

  return SigningKey.computePublicKey(uncompressed, true);
}

/**
 * Reveals the compressed public key behind an address, using the wallet itself.
 *
 * @param signDigest - Signs a 32-byte digest with the wallet's key.
 * @param address - The address the recovered key must hash to.
 * @returns The `0x`-prefixed compressed public key.
 * @remarks Nothing is broadcast and no private key moves: the public half is
 *   arithmetic on a signature over {@link KEY_DISCOVERY_DIGEST}.
 */
export async function publicKeyForWallet(
  signDigest: (digest: `0x${string}`) => Promise<string>,
  address: string,
): Promise<string> {
  const signature = await signDigest(KEY_DISCOVERY_DIGEST);
  return recoverCompressedPublicKey(KEY_DISCOVERY_DIGEST, signature, address);
}

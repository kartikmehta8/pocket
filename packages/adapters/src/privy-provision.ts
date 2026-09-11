/**
 * Provisioning a Privy wallet.
 *
 * Separated from {@link PrivyWalletProvider} so the class reads as the port it
 * implements rather than as a sequence of vendor calls.
 */

import type { PrivyClient } from '@privy-io/server-auth';
import { PocketError, type AssetId, type ChainId } from '@pocket/core';
import { chainConfig } from './chains.js';
import type { PrivyTransaction } from './privy-transactions.js';

/** A wallet as Privy returns it, before Pocket has learned its public key. */
export interface ProvisionedPrivyWallet {
  id: string;
  address: string;
}

/**
 * Creates an app-owned Privy wallet.
 *
 * @param privy - Authenticated Privy client.
 * @param input - Policy to attach, and the agent it is being created for.
 * @returns Privy's wallet id and public address. Never a secret.
 * @throws {PocketError} `UPSTREAM_UNAVAILABLE` when Privy cannot be reached.
 */
export async function provisionPrivyWallet(
  privy: PrivyClient,
  input: { policyId: string | null; agentId: string },
): Promise<ProvisionedPrivyWallet> {
  try {
    const wallet = await privy.walletApi.createWallet({
      chainType: 'ethereum',
      ...(input.policyId === null ? {} : { policyIds: [input.policyId] }),
    });
    return { id: wallet.id, address: wallet.address };
  } catch (cause) {
    throw new PocketError(
      'UPSTREAM_UNAVAILABLE',
      'Privy could not provision a wallet.',
      { agentId: input.agentId },
      cause,
    );
  }
}

/**
 * Signs and broadcasts one already-built transaction through Privy.
 *
 * @param privy - Authenticated Privy client.
 * @param input - Wallet, chain, idempotency key, the transaction, and what to
 *   say if Privy refuses.
 * @returns The broadcast transaction hash.
 * @throws {PocketError} `PAYMENT_FAILED` when Privy rejects it, which includes
 *   its own wallet policy denying the call.
 */
export async function sendPrivyTransaction(
  privy: PrivyClient,
  input: {
    providerWalletId: string;
    chain: ChainId;
    asset: AssetId;
    idempotencyKey: string;
    transaction: PrivyTransaction;
    refusal: string;
  },
): Promise<{ txHash: string }> {
  try {
    const result = await privy.walletApi.ethereum.sendTransaction({
      walletId: input.providerWalletId,
      caip2: chainConfig(input.chain).caip2,
      idempotencyKey: input.idempotencyKey,
      transaction: input.transaction,
    });
    return { txHash: result.hash };
  } catch (cause) {
    throw new PocketError(
      'PAYMENT_FAILED',
      input.refusal,
      { chain: input.chain, asset: input.asset },
      cause,
    );
  }
}

/**
 * Signs a 32-byte digest with a wallet's secp256k1 key.
 *
 * @param privy - Privy client.
 * @param walletId - Provider wallet identifier.
 * @param digest - `0x`-prefixed 32-byte hash to sign.
 * @returns The `0x`-prefixed signature. 65 bytes: r, s and the recovery byte.
 * @throws {PocketError} `PAYMENT_FAILED` when Privy refuses, which includes a
 *   wallet policy denying the signing method.
 * @remarks The primitive that lets a Privy-custodied wallet sign for chains
 * Privy has no native integration with. The caller supplies the digest, so the
 * hashing rule stays with whoever knows the target chain.
 */
export async function signPrivyDigest(
  privy: PrivyClient,
  walletId: string,
  digest: `0x${string}`,
): Promise<string> {
  try {
    const result = await privy.walletApi.ethereum.secp256k1Sign({ walletId, hash: digest });
    return result.signature;
  } catch (cause) {
    throw new PocketError(
      'PAYMENT_FAILED',
      'Privy refused to sign the digest.',
      { walletId },
      cause,
    );
  }
}

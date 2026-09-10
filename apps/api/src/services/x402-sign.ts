/**
 * Signing an authorized payment.
 *
 * By the time this runs the payment row is `approved`, which already reserves
 * the amount against the agent's daily budget. Signing can still fail, so the
 * reservation is released here rather than left standing for a payment that
 * never existed.
 */

import { createPrivyHederaSigner, type PrivyWalletProvider } from '@pocket/adapters';
import { recordWalletPublicKey, type Database } from '@pocket/db';
import type { Payment, Wallet } from '@pocket/core';
import { recordSettlement } from './x402-settle.js';
import type { X402Requirements } from './x402-types.js';

/** What signing needs: a wallet provider, a database, and the mirror node. */
export interface SignDeps {
  db: Database;
  wallet: PrivyWalletProvider;
  mirrorNodeUrl: string;
}

/**
 * Resolves the public key Hedera needs to identify the paying account.
 *
 * @param deps - Wallet provider and database handle.
 * @param wallet - The paying agent's wallet row.
 * @returns The compressed secp256k1 public key.
 * @remarks Wallets provisioned since the key was captured carry it already.
 *   Older ones derive it from a signature over a fixed digest and are filled
 *   in, so the round trip happens once rather than on every payment. Either
 *   way the chain is never asked, which is what lets an account that has not
 *   signed anything yet make its first payment.
 */
async function walletPublicKey(deps: SignDeps, wallet: Wallet): Promise<string> {
  if (wallet.publicKey !== null) return wallet.publicKey;
  const derived = await deps.wallet.publicKeyFor({
    providerWalletId: wallet.providerWalletId,
    address: wallet.address,
  });
  await recordWalletPublicKey(deps.db, wallet.id, derived);
  return derived;
}

/**
 * Signs the transfer the seller asked for.
 *
 * @param deps - Wallet provider, database handle and mirror node URL.
 * @param orgId - Tenant scope.
 * @param payment - The approved payment, whose reservation is at stake.
 * @param wallet - The paying agent's wallet.
 * @param requirements - The seller's x402 terms.
 * @returns The partially signed transaction, ready to present.
 * @throws Whatever signing threw, after releasing the reservation so a failed
 *   attempt costs the agent nothing.
 */
export async function signAuthorizedPayment(
  deps: SignDeps,
  orgId: string,
  payment: Payment,
  wallet: Wallet,
  requirements: X402Requirements,
): Promise<string> {
  try {
    const publicKey = await walletPublicKey(deps, wallet);
    const signer = await createPrivyHederaSigner({
      signDigest: (walletId, digest) => deps.wallet.signDigest(walletId, digest),
      walletId: wallet.providerWalletId,
      evmAddress: wallet.address,
      network: requirements.network,
      mirrorNodeUrl: deps.mirrorNodeUrl,
      publicKey,
    });

    return await signer.createPartiallySignedTransferTransaction({
      network: requirements.network,
      amount: requirements.amount,
      payTo: requirements.payTo,
      asset: requirements.asset,
      extra: requirements.extra ?? undefined,
    });
  } catch (cause) {
    await recordSettlement(deps.db, orgId, payment.id, {
      success: false,
      reason: `The payment could not be signed: ${String(cause)}`,
    });
    throw cause;
  }
}

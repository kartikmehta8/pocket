/**
 * A Hedera transaction signer backed by Privy custody.
 *
 * The x402 Hedera `exact` scheme expects a `ClientHederaSigner`, and the
 * reference implementation takes a raw Hedera private key. Pocket has no
 * private key and does not want one, so this signer satisfies the same
 * interface while delegating the actual signature to Privy.
 *
 * The bridge works because a Privy wallet is secp256k1 and Hedera's ECDSA
 * signing hashes with keccak-256, which is exactly what Privy's raw signing
 * primitive expects. The signature Privy returns verifies against the Hedera
 * public key of the same account.
 *
 * Nothing here is hard-coded: the Hedera account id and public key are
 * resolved from the mirror node at construction time using the wallet's EVM
 * address.
 */

import { AccountId, Hbar, TokenId, TransactionId, TransferTransaction } from '@hiero-ledger/sdk';
import { createHederaClient, HBAR_ASSET_ID } from '@x402/hedera';
import { resolveHederaAccount } from './hedera-account.js';
import { keccak256, getBytes } from 'ethers';
import { PocketError } from '@pocket/core';

/** The subset of a payment requirement this signer reads. */
export interface HederaPaymentRequirements {
  network: string;
  amount: string;
  payTo: string;
  asset: string;
  extra?: Record<string, unknown> | undefined;
}

/** The interface `@x402/hedera`'s exact scheme consumes. */
export interface ClientHederaSignerLike {
  readonly accountId: string;
  createPartiallySignedTransferTransaction(
    requirements: HederaPaymentRequirements,
  ): Promise<string>;
}

/** Everything the signer needs, injected rather than read from globals. */
export interface PrivyHederaSignerOptions {
  /** Signs a 32-byte digest. Supplied by the Privy wallet provider. */
  signDigest(walletId: string, digest: `0x${string}`): Promise<string>;
  /** Privy's identifier for the wallet that will pay. */
  walletId: string;
  /** The wallet's EVM address, used to resolve its Hedera account. */
  evmAddress: string;
  /** CAIP-2 network, for example `hedera:testnet`. */
  network: string;
  /** Mirror node base URL for account resolution. */
  mirrorNodeUrl: string;
  /**
   * The wallet's compressed public key, when it is already known.
   *
   * @remarks Supply it and the mirror node is consulted only for the account
   * id. That is what lets a freshly funded account pay: until it has signed
   * something the chain has no key on file for it, so a lookup would fail on
   * exactly the transaction that would have fixed it.
   */
  publicKey?: string | undefined;
}

/**
 * Builds a Hedera signer that never touches a private key.
 *
 * @param options - Signing callback, wallet identity and network endpoints.
 * @returns A signer the x402 Hedera scheme can use directly.
 * @remarks The transaction id names the facilitator, which is what makes the
 * facilitator the fee payer: the agent never needs gas of its own. Privy
 * returns a 65-byte signature with a trailing recovery id, and Hedera wants the
 * 64-byte `r || s` pair, so the tail is dropped.
 */
export async function createPrivyHederaSigner(
  options: PrivyHederaSignerOptions,
): Promise<ClientHederaSignerLike> {
  const { accountId, publicKey } = await resolveHederaAccount(
    options.mirrorNodeUrl,
    options.evmAddress,
    options.publicKey,
  );
  const payer = AccountId.fromString(accountId);

  return {
    accountId,

    async createPartiallySignedTransferTransaction(
      requirements: HederaPaymentRequirements,
    ): Promise<string> {
      const feePayer = requirements.extra?.['feePayer'];
      if (typeof feePayer !== 'string') {
        throw new PocketError(
          'VALIDATION_FAILED',
          'The payment requirement carries no facilitator fee payer.',
        );
      }
      const amount = BigInt(requirements.amount);
      if (amount <= 0n) {
        throw new PocketError('VALIDATION_FAILED', 'Payment amount must be greater than zero.');
      }

      const payTo = AccountId.fromString(requirements.payTo);
      const transaction = new TransferTransaction();
      if (requirements.asset === HBAR_ASSET_ID) {
        transaction.addHbarTransfer(payer, Hbar.fromTinybars((-amount).toString()));
        transaction.addHbarTransfer(payTo, Hbar.fromTinybars(amount.toString()));
      } else {
        const token = TokenId.fromString(requirements.asset);
        transaction.addTokenTransfer(token, payer, -amount);
        transaction.addTokenTransfer(token, payTo, amount);
      }

      transaction.setTransactionId(TransactionId.generate(AccountId.fromString(feePayer)));

      const client = createHederaClient(requirements.network);
      try {
        transaction.freezeWith(client);
        const signed = await transaction.signWith(publicKey, async (bytes) => {
          const signature = await options.signDigest(
            options.walletId,
            keccak256(bytes) as `0x${string}`,
          );
          return getBytes(signature).slice(0, 64);
        });
        return Buffer.from(signed.toBytes()).toString('base64');
      } finally {
        client.close();
      }
    },
  };
}

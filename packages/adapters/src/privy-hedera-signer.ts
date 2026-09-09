/**
 * A Hedera transaction signer backed by Privy custody.
 *
 * The x402 Hedera `exact` scheme expects a `ClientHederaSigner`, and the
 * reference implementation takes a raw Hedera private key. Purse has no
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

import {
  AccountId,
  Hbar,
  PublicKey,
  TokenId,
  TransactionId,
  TransferTransaction,
} from '@hiero-ledger/sdk';
import { createHederaClient, HBAR_ASSET_ID } from '@x402/hedera';
import { keccak256, getBytes } from 'ethers';
import { PurseError } from '@purse/core';

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
}

interface MirrorAccount {
  account?: unknown;
  evm_address?: unknown;
  key?: { _type?: unknown; key?: unknown } | null;
}

/**
 * Resolves a Hedera account id and public key from an EVM address.
 *
 * Exported because the seller needs the same translation: the x402 Hedera
 * scheme addresses accounts by id, while wallets are provisioned by EVM
 * address.
 *
 * @param mirrorNodeUrl - Mirror node base URL.
 * @param evmAddress - The wallet's `0x` address.
 * @returns The account id and its ECDSA public key.
 * @throws {PurseError} `NOT_FOUND` when the account does not exist yet, which
 *   on Hedera means it has never received a transfer, or
 *   `VALIDATION_FAILED` when the account is not secp256k1 and therefore cannot
 *   be signed for by a Privy wallet.
 */
export async function resolveHederaAccount(
  mirrorNodeUrl: string,
  evmAddress: string,
): Promise<{ accountId: string; evmAddress: string; publicKey: PublicKey }> {
  const response = await fetch(
    `${mirrorNodeUrl.replace(/\/$/, '')}/api/v1/accounts/${evmAddress}`,
    { signal: AbortSignal.timeout(15_000) },
  );
  if (!response.ok) {
    throw new PurseError('NOT_FOUND', 'No Hedera account exists for this wallet yet.', {
      evmAddress,
    });
  }
  const body = (await response.json()) as MirrorAccount;
  const accountId = body.account;
  const resolvedEvm = body.evm_address;
  const keyType = body.key?._type;
  const keyHex = body.key?.key;

  if (typeof accountId !== 'string') {
    throw new PurseError('NOT_FOUND', 'Mirror node returned no account id.', { evmAddress });
  }
  if (keyType !== 'ECDSA_SECP256K1' || typeof keyHex !== 'string') {
    throw new PurseError(
      'VALIDATION_FAILED',
      'Hedera account is not secp256k1, so a Privy wallet cannot sign for it.',
      { evmAddress, keyType: String(keyType) },
    );
  }
  return {
    accountId,
    // The mirror node echoes the canonical EVM address, which may differ from
    // the long-zero form of the account number.
    evmAddress: typeof resolvedEvm === 'string' ? resolvedEvm : evmAddress,
    publicKey: PublicKey.fromStringECDSA(keyHex),
  };
}

/**
 * Builds a Hedera signer that never touches a private key.
 *
 * @param options - Signing callback, wallet identity and network endpoints.
 * @returns A signer the x402 Hedera scheme can use directly.
 */
export async function createPrivyHederaSigner(
  options: PrivyHederaSignerOptions,
): Promise<ClientHederaSignerLike> {
  const { accountId, publicKey } = await resolveHederaAccount(
    options.mirrorNodeUrl,
    options.evmAddress,
  );
  const payer = AccountId.fromString(accountId);

  return {
    accountId,

    async createPartiallySignedTransferTransaction(
      requirements: HederaPaymentRequirements,
    ): Promise<string> {
      const feePayer = requirements.extra?.['feePayer'];
      if (typeof feePayer !== 'string') {
        throw new PurseError(
          'VALIDATION_FAILED',
          'The payment requirement carries no facilitator fee payer.',
        );
      }
      const amount = BigInt(requirements.amount);
      if (amount <= 0n) {
        throw new PurseError('VALIDATION_FAILED', 'Payment amount must be greater than zero.');
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

      // The transaction id names the facilitator, which is what makes the
      // facilitator the fee payer. The agent never needs gas of its own.
      transaction.setTransactionId(TransactionId.generate(AccountId.fromString(feePayer)));

      const client = createHederaClient(requirements.network);
      try {
        transaction.freezeWith(client);
        const signed = await transaction.signWith(publicKey, async (bytes) => {
          const signature = await options.signDigest(
            options.walletId,
            keccak256(bytes) as `0x${string}`,
          );
          // Privy returns 65 bytes with a trailing recovery id; Hedera wants
          // the 64-byte r||s pair.
          return getBytes(signature).slice(0, 64);
        });
        return Buffer.from(signed.toBytes()).toString('base64');
      } finally {
        client.close();
      }
    },
  };
}

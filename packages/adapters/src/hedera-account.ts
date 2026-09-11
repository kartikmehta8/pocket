/**
 * Resolving a Hedera account from an EVM address.
 *
 * Hedera gives every account two names: an entity id and, for accounts created
 * from an EVM key, an address. Wallets are provisioned by address and payments
 * are addressed by id, so something has to translate between them. That is
 * this file, and it is separate from signing because the seller needs the same
 * translation without holding any key.
 */

import { PublicKey } from '@hiero-ledger/sdk';
import { PocketError } from '@pocket/core';

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
 * @param knownPublicKey - The wallet's compressed public key, when the caller
 *   already holds it. Skips the chain lookup for the key, which a hollow
 *   account cannot answer.
 * @returns The account id and its ECDSA public key.
 * @throws {PocketError} `NOT_FOUND` when the account does not exist yet, which
 *   on Hedera means it has never received a transfer, or
 *   `VALIDATION_FAILED` when no key was supplied and the account has published
 *   none (a hollow account, completed by its first signed transaction), or is
 *   held by a key of a type a Privy wallet cannot sign with.
 */
export async function resolveHederaAccount(
  mirrorNodeUrl: string,
  evmAddress: string,
  knownPublicKey?: string,
): Promise<{ accountId: string; evmAddress: string; publicKey: PublicKey }> {
  const response = await fetch(
    `${mirrorNodeUrl.replace(/\/$/, '')}/api/v1/accounts/${evmAddress}`,
    { signal: AbortSignal.timeout(15_000) },
  );
  if (!response.ok) {
    throw new PocketError('NOT_FOUND', 'No Hedera account exists for this wallet yet.', {
      evmAddress,
    });
  }
  const body = (await response.json()) as MirrorAccount;
  const accountId = body.account;
  const resolvedEvm = body.evm_address;
  const keyType = body.key?._type;
  const keyHex = body.key?.key;

  if (typeof accountId !== 'string') {
    throw new PocketError('NOT_FOUND', 'Mirror node returned no account id.', { evmAddress });
  }
  // A caller that already holds the key needs nothing further from the chain.
  // This is the ordinary path: the key was captured when the wallet was
  // provisioned, so a hollow account pays like any other and that first
  // payment is what completes it.
  if (knownPublicKey !== undefined) {
    return {
      accountId,
      evmAddress: typeof resolvedEvm === 'string' ? resolvedEvm : evmAddress,
      publicKey: PublicKey.fromStringECDSA(knownPublicKey),
    };
  }

  // A hollow account — created by a transfer to an EVM address that has never
  // signed anything — has no key on record yet. That is not the same fault as
  // an account held by a key of the wrong type, and saying so sends the reader
  // to the wrong place: the fix is to associate the token, whose transaction
  // publishes the key and completes the account.
  if (body.key === null || body.key === undefined) {
    throw new PocketError(
      'VALIDATION_FAILED',
      'This Hedera account has not published a public key yet, so it cannot be signed for. It was created by a transfer and is still hollow. Associate the asset first: that transaction publishes the key and completes the account.',
      { evmAddress, accountId },
    );
  }
  if (keyType !== 'ECDSA_SECP256K1' || typeof keyHex !== 'string') {
    throw new PocketError(
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

/** What the mirror node knows about an account, without judging it. */
export interface HederaAccountState {
  /** The `0.0.x` entity id. */
  accountId: string;
  /**
   * Whether the account has published its public key.
   *
   * @remarks `false` means hollow: created by a transfer to an address that
   * has never signed anything. Pocket can still pay from one, because it holds
   * the key from provisioning, but an outside party reading the account sees
   * no key at all — and at least one faucet refuses to send to such an
   * account, which is what strands an operator at the funding step.
   */
  keyPublished: boolean;
}

/**
 * Reads an account's id and whether it has published a key.
 *
 * @param mirrorNodeUrl - Mirror node base URL.
 * @param evmAddress - The wallet's `0x` address.
 * @returns The account's state, or `null` when no account exists yet.
 * @throws When the mirror node answers with anything other than success or a
 *   404. An outage is not the same fact as an absent account, and collapsing
 *   the two tells an operator to go and fund a wallet that is already funded.
 * @remarks Deliberately does not throw for a hollow account, unlike
 * {@link resolveHederaAccount}. That one answers "can this be signed for",
 * where hollow plus a known key is fine; this one answers "what does the rest
 * of the world see", where it is not.
 */
export async function readHederaAccountState(
  mirrorNodeUrl: string,
  evmAddress: string,
): Promise<HederaAccountState | null> {
  const response = await fetch(
    `${mirrorNodeUrl.replace(/\/$/, '')}/api/v1/accounts/${evmAddress}`,
    { signal: AbortSignal.timeout(15_000) },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new PocketError('UPSTREAM_UNAVAILABLE', 'The mirror node could not be read.', {
      evmAddress,
      status: response.status,
    });
  }
  const body = (await response.json()) as MirrorAccount;
  if (typeof body.account !== 'string') return null;
  return {
    accountId: body.account,
    keyPublished: body.key !== null && body.key !== undefined && body.key._type !== undefined,
  };
}

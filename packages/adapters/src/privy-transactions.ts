/**
 * EVM transaction construction for Privy-custodied wallets.
 *
 * Kept apart from the provider so the shape of a transfer is testable without
 * a Privy client, and so the provider reads as orchestration rather than
 * encoding.
 */

import { Interface } from 'ethers';
import {
  PocketError,
  type AssociateTokenInput,
  type CompleteAccountInput,
  type SendPaymentInput,
} from '@pocket/core';
import { chainConfig, ERC20_ABI, IHRC719_ASSOCIATE, tokenAddress } from './chains.js';

const erc20 = new Interface([...ERC20_ABI]);

/** An EVM transaction in the hex-quantity shape Privy's wallet API expects. */
export interface PrivyTransaction {
  to: `0x${string}`;
  value: `0x${string}`;
  chainId: number;
  data?: `0x${string}`;
  gasLimit?: number;
}

/**
 * Builds the transaction for a value transfer.
 *
 * @param input - Recipient, amount in base units, asset and chain.
 * @returns The transaction to sign.
 * @throws {PocketError} `VALIDATION_FAILED` when a token asset has no
 *   configured contract address, rather than guessing one.
 * @remarks A native transfer carries value directly, converted from the
 *   asset's base units into wei — on Hedera those are tinybars and weibars,
 *   ten orders of magnitude apart. A token transfer carries zero value and
 *   ERC-20 `transfer` calldata, whose amount stays in the token's own base
 *   units. Amounts are hex-encoded because Privy types these fields as hex
 *   quantities.
 */
export function buildTransferTransaction(input: SendPaymentInput): PrivyTransaction {
  const config = chainConfig(input.chain);
  const token = tokenAddress(input.chain, input.asset);

  if (token === null && input.asset !== config.nativeAsset) {
    throw new PocketError(
      'VALIDATION_FAILED',
      `No contract address configured for ${input.asset}.`,
      {
        asset: input.asset,
        chain: input.chain,
      },
    );
  }

  if (token === null) {
    return {
      to: input.to as `0x${string}`,
      value: `0x${(input.amount * config.weiPerNativeUnit).toString(16)}`,
      chainId: config.chainId,
    };
  }

  return {
    to: token as `0x${string}`,
    data: erc20.encodeFunctionData('transfer', [input.to, input.amount]) as `0x${string}`,
    value: '0x0',
    chainId: config.chainId,
  };
}

/**
 * Builds the transaction that opts a wallet into holding a token.
 *
 * @param input - Wallet, asset and chain.
 * @returns The transaction to sign, or `null` when the asset is the chain's
 *   native currency and association does not apply.
 * @throws {PocketError} `VALIDATION_FAILED` when the token has no configured
 *   contract address.
 * @remarks Calls `associate()` on the token's own address, which Hedera routes
 *   to the token service under HIP-719. The gas limit is explicit because the
 *   relay's estimate is unreliable for facade calls.
 */
export function buildAssociateTransaction(input: AssociateTokenInput): PrivyTransaction | null {
  const config = chainConfig(input.chain);
  if (input.asset === config.nativeAsset) return null;

  const token = tokenAddress(input.chain, input.asset);
  if (token === null) {
    throw new PocketError(
      'VALIDATION_FAILED',
      `No contract address configured for ${input.asset}.`,
      {
        asset: input.asset,
        chain: input.chain,
      },
    );
  }

  return {
    to: token as `0x${string}`,
    data: IHRC719_ASSOCIATE,
    value: '0x0',
    chainId: config.chainId,
    gasLimit: 1_000_000,
  };
}

/**
 * Builds the transaction that publishes a wallet's key on chain.
 *
 * @param input - Wallet and chain.
 * @returns The transaction to sign.
 * @remarks Sends nothing: zero value, to the wallet's own address, no
 * calldata. Only the signature matters, because that is what completes a
 * hollow Hedera account. The gas limit is the floor for a plain transfer, so
 * this costs the wallet a fraction of a cent in HBAR and moves no money at
 * all.
 */
export function buildCompleteAccountTransaction(input: CompleteAccountInput): PrivyTransaction {
  return {
    to: input.address as `0x${string}`,
    value: '0x0',
    chainId: chainConfig(input.chain).chainId,
    gasLimit: 21_000,
  };
}

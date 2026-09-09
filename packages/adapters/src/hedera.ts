/**
 * The Hedera chain adapter.
 *
 * Reads balances and confirms settlement over Hedera's Ethereum-compatible
 * JSON-RPC relay.
 */

import { Contract, JsonRpcProvider, formatUnits } from 'ethers';
import {
  PurseError,
  decimalsOf,
  type AssetId,
  type ChainId,
  type ChainProvider,
  type TransactionReceipt,
} from '@purse/core';
import { chainConfig, ERC20_ABI, IHRC719_IS_ASSOCIATED, tokenAddress } from './chains.js';

/** Chain provider backed by a Hedera JSON-RPC relay. */
export class HederaChainProvider implements ChainProvider {
  public readonly chain: ChainId;
  readonly #provider: JsonRpcProvider;

  /**
   * @param chain - Which Hedera network to talk to.
   */
  public constructor(chain: ChainId = 'hedera-testnet') {
    this.chain = chain;
    const config = chainConfig(chain);
    this.#provider = new JsonRpcProvider(config.rpcUrl, config.chainId, {
      staticNetwork: true,
    });
  }

  /**
   * Reads a spendable balance.
   *
   * @param address - Account to read.
   * @param asset - Asset to read. Native assets read the account balance;
   *   token assets read the ERC-20 contract.
   * @returns Balance in the asset's base units.
   * @throws {PurseError} `UPSTREAM_UNAVAILABLE` when the relay cannot be
   *   reached, or `VALIDATION_FAILED` when a token has no configured address.
   */
  public async getBalance(address: string, asset: AssetId): Promise<bigint> {
    const config = chainConfig(this.chain);
    try {
      if (asset === config.nativeAsset) {
        const wei = await this.#provider.getBalance(address);
        return this.#weiToBaseUnits(wei, asset);
      }
      const token = tokenAddress(this.chain, asset);
      if (token === null) {
        throw new PurseError('VALIDATION_FAILED', `No contract address configured for ${asset}.`);
      }
      const contract = new Contract(token, [...ERC20_ABI], this.#provider);
      const raw: unknown = await contract['balanceOf']?.(address);
      return typeof raw === 'bigint' ? raw : BigInt(String(raw));
    } catch (cause) {
      if (PurseError.is(cause)) throw cause;
      throw new PurseError(
        'UPSTREAM_UNAVAILABLE',
        'Could not read balance from the Hedera relay.',
        { chain: this.chain, asset },
        cause,
      );
    }
  }

  /**
   * Converts an 18-decimal wei value to an asset's own precision.
   *
   * @param wei - Balance as the relay reports it.
   * @param asset - Asset whose precision to target.
   * @returns Balance in the asset's base units.
   * @remarks Hedera's relay reports HBAR balances in 18-decimal wei for EVM
   * compatibility even though HBAR itself has 8 decimals. Dividing rather than
   * reinterpreting is what keeps a balance from reading 10^10 times too large.
   */
  #weiToBaseUnits(wei: bigint, asset: AssetId): bigint {
    const decimals = decimalsOf(asset);
    if (decimals >= 18) return wei * 10n ** BigInt(decimals - 18);
    return wei / 10n ** BigInt(18 - decimals);
  }

  /**
   * Waits for a transaction to be mined.
   *
   * @param txHash - Hash returned by the wallet provider.
   * @param timeoutMs - Deadline. Defaults to 60 seconds.
   * @returns The receipt, reporting success or revert.
   * @throws {PurseError} `SETTLEMENT_FAILED` when the deadline passes without
   *   a receipt. The payment is left `submitted` rather than marked settled,
   *   because a missing receipt is not evidence of failure.
   */
  public async waitForReceipt(txHash: string, timeoutMs = 60_000): Promise<TransactionReceipt> {
    try {
      const receipt = await this.#provider.waitForTransaction(txHash, 1, timeoutMs);
      if (receipt === null) {
        throw new PurseError(
          'SETTLEMENT_FAILED',
          'Timed out waiting for the transaction receipt.',
          {
            txHash,
          },
        );
      }
      return { txHash, success: receipt.status === 1, blockNumber: receipt.blockNumber };
    } catch (cause) {
      if (PurseError.is(cause)) throw cause;
      throw new PurseError(
        'SETTLEMENT_FAILED',
        'Could not confirm the transaction.',
        { txHash },
        cause,
      );
    }
  }

  /**
   * Whether an account has opted into holding a token.
   *
   * @param address - Account to check.
   * @param asset - Asset to check.
   * @returns `true` or `false` for a token, `null` for the native asset or
   *   when no contract address is configured.
   * @remarks Uses the HIP-719 facade: calling `isAssociated()` on the token's
   *   own address, with the account as `msg.sender`. Hedera routes that call
   *   to the token service rather than to contract code.
   */
  public async isTokenAssociated(address: string, asset: AssetId): Promise<boolean | null> {
    const config = chainConfig(this.chain);
    if (asset === config.nativeAsset) return null;
    const token = tokenAddress(this.chain, asset);
    if (token === null) return null;
    try {
      const result = await this.#provider.call({
        from: address,
        to: token,
        data: IHRC719_IS_ASSOCIATED,
      });
      return BigInt(result) === 1n;
    } catch {
      // Treat an unanswerable question as unknown rather than as "not
      // associated", which would block a payment that would have succeeded.
      return null;
    }
  }

  /**
   * Builds a HashScan link for a transaction.
   *
   * @param txHash - Transaction hash.
   * @returns A URL an operator or a judge can open.
   */
  public explorerUrl(txHash: string): string {
    return `${chainConfig(this.chain).explorerBase}/${txHash}`;
  }

  /** Formats base units for human-readable logs. Never used for arithmetic. */
  public static display(amount: bigint, asset: AssetId): string {
    return formatUnits(amount, decimalsOf(asset));
  }
}

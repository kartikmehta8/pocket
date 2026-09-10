/**
 * Deterministic in-memory adapters.
 *
 * These exist so the whole system runs, and the whole demo is reproducible,
 * without any vendor credentials. They are also what the integration tests
 * bind to, which keeps the suite fast and offline. They are never selected
 * when live credentials are present.
 */

import { randomUUID } from 'node:crypto';
import {
  parseAmount,
  type AnalyticsProvider,
  type AssetId,
  type ChainId,
  type ChainProvider,
  type IndexedTransfer,
  type TransactionReceipt,
  type TransferQuery,
} from '@pocket/core';

/** In-memory chain provider with instant, always-successful settlement. */
export class MockChainProvider implements ChainProvider {
  public readonly chain: ChainId;
  readonly #balances = new Map<string, bigint>();
  readonly #associations = new Map<string, boolean>();

  /**
   * @param chain - Chain identity to report.
   * @param defaultBalance - Balance returned for any address not explicitly set.
   */
  public constructor(
    chain: ChainId = 'hedera-testnet',
    private readonly defaultBalance: bigint = parseAmount('1000', 6),
  ) {
    this.chain = chain;
  }

  /** Sets an address's balance, for tests that exercise insufficient funds. */
  public setBalance(address: string, asset: AssetId, amount: bigint): void {
    this.#balances.set(`${address.toLowerCase()}:${asset}`, amount);
  }

  /**
   * Reads a balance.
   *
   * @param address - Account to read.
   * @param asset - Asset to read.
   * @returns The configured balance, or the default.
   */
  public getBalance(address: string, asset: AssetId): Promise<bigint> {
    return Promise.resolve(
      this.#balances.get(`${address.toLowerCase()}:${asset}`) ?? this.defaultBalance,
    );
  }

  /**
   * Confirms settlement immediately.
   *
   * @param txHash - Transaction hash.
   * @returns A successful receipt.
   */
  public waitForReceipt(txHash: string): Promise<TransactionReceipt> {
    return Promise.resolve({ txHash, success: true, blockNumber: 1 });
  }

  /** Builds a HashScan-shaped link so the UI renders identically to live mode. */
  public explorerUrl(txHash: string): string {
    return `https://hashscan.io/testnet/transaction/${txHash}`;
  }

  /**
   * Reports association state.
   *
   * @param address - Account to check.
   * @param asset - Asset to check.
   * @returns `null` for the native asset, otherwise whatever
   *   {@link MockChainProvider.setAssociated} last recorded, defaulting to
   *   associated so existing tests are unaffected.
   */
  public isTokenAssociated(address: string, asset: AssetId): Promise<boolean | null> {
    if (asset === 'HBAR') return Promise.resolve(null);
    return Promise.resolve(this.#associations.get(`${address.toLowerCase()}:${asset}`) ?? true);
  }

  /** Sets association state, for tests that exercise an unassociated recipient. */
  public setAssociated(address: string, asset: AssetId, associated: boolean): void {
    this.#associations.set(`${address.toLowerCase()}:${asset}`, associated);
  }
}

/**
 * Analytics provider that indexes nothing.
 *
 * @remarks Selected when no subgraph is configured. It reports `isLive()` as
 * false so the analytics service falls back to Pocket's own ledger and labels
 * the result `ledger` rather than claiming on-chain provenance it does not have.
 */
export class LedgerAnalyticsProvider implements AnalyticsProvider {
  public readonly name = 'ledger';

  /** This provider does not read a live index. */
  public isLive(): boolean {
    return false;
  }

  /**
   * Returns no transfers.
   *
   * @param _query - Ignored.
   * @returns An empty list.
   */
  public getTransfers(_query: TransferQuery): Promise<IndexedTransfer[]> {
    return Promise.resolve([]);
  }
}

/** Generates an opaque idempotency key for callers that have no natural one. */
export function newIdempotencyKey(): string {
  return randomUUID();
}

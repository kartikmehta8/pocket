/**
 * Deterministic in-memory adapters.
 *
 * These exist so the whole system runs, and the whole demo is reproducible,
 * without any vendor credentials. They are also what the integration tests
 * bind to, which keeps the suite fast and offline. They are never selected
 * when live credentials are present.
 */

import { createHash, randomUUID } from 'node:crypto';
import {
  parseAmount,
  type AnalyticsProvider,
  type AssociateTokenInput,
  type AssetId,
  type ChainId,
  type ChainProvider,
  type IndexedTransfer,
  type ProvisionedWallet,
  type SendPaymentInput,
  type SubmittedTransaction,
  type TransactionReceipt,
  type TransferQuery,
  type WalletProvider,
} from '@pocket/core';

/** Derives a stable fake address from any seed, so a demo replays identically. */
function deterministicAddress(seed: string): string {
  return `0x${createHash('sha256').update(seed).digest('hex').slice(0, 40)}`;
}

/** In-memory wallet provider. Signs nothing and holds nothing of value. */
export class MockWalletProvider implements WalletProvider {
  public readonly name = 'mock';
  readonly #sent: SendPaymentInput[] = [];
  readonly #associated = new Set<string>();

  /**
   * Returns a deterministic address for the agent.
   *
   * @param input - Owning organization, agent and chain.
   * @returns A provisioned wallet whose address is a pure function of the agent id.
   */
  public createWallet(input: {
    orgId: string;
    agentId: string;
    chain: ChainId;
  }): Promise<ProvisionedWallet> {
    return Promise.resolve({
      providerWalletId: `mockwallet_${input.agentId}`,
      address: deterministicAddress(input.agentId),
    });
  }

  /**
   * Records a transfer and returns a synthetic hash.
   *
   * @param input - The transfer instruction.
   * @returns A synthetic transaction hash derived from the idempotency key, so
   *   a replayed instruction yields the same hash.
   */
  public sendPayment(input: SendPaymentInput): Promise<SubmittedTransaction> {
    this.#sent.push(input);
    return Promise.resolve({
      txHash: `0x${createHash('sha256').update(input.idempotencyKey).digest('hex')}`,
    });
  }

  /**
   * Records an association and returns a synthetic hash.
   *
   * @param input - Wallet, asset and chain.
   * @returns A synthetic transaction, or `null` for a native asset.
   */
  public associateToken(input: AssociateTokenInput): Promise<SubmittedTransaction | null> {
    if (input.asset === 'HBAR') return Promise.resolve(null);
    this.#associated.add(`${input.address.toLowerCase()}:${input.asset}`);
    return Promise.resolve({
      txHash: `0x${createHash('sha256').update(`associate:${input.idempotencyKey}`).digest('hex')}`,
    });
  }

  /** Whether this provider was asked to associate an address with an asset. */
  public hasAssociated(address: string, asset: AssetId): boolean {
    return this.#associated.has(`${address.toLowerCase()}:${asset}`);
  }

  /** Every transfer this provider was asked to make, for assertions in tests. */
  public get sent(): readonly SendPaymentInput[] {
    return this.#sent;
  }
}

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

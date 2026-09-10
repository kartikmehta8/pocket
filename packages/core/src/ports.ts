/**
 * Ports: the interfaces every vendor adapter must satisfy.
 *
 * Route handlers, MCP tool handlers and UI components talk to these types and
 * never to a vendor SDK. That keeps Privy, Hedera and The Graph swappable and
 * lets the whole system run against deterministic fakes in tests.
 */

import type { AssetId, ChainId } from './assets.js';

/** A wallet as returned by the wallet provider after provisioning. */
export interface ProvisionedWallet {
  /** The provider's own identifier for the wallet. Never a secret. */
  providerWalletId: string;
  /** The public address. */
  address: string;
  /**
   * The compressed secp256k1 public key, `0x`-prefixed.
   *
   * @remarks Hedera addresses an account by key, and a chain only learns a
   * key once the account has signed something. Capturing it at provisioning
   * means the first payment does not have to be preceded by a throwaway
   * transaction just to publish it.
   */
  publicKey: string;
}

/** Instruction to move value from a managed wallet. */
export interface SendPaymentInput {
  providerWalletId: string;
  from: string;
  to: string;
  /** Amount in the asset's base units. */
  amount: bigint;
  asset: AssetId;
  chain: ChainId;
  /** Opaque correlation id used for provider-side idempotency. */
  idempotencyKey: string;
}

/** A broadcast transaction, before it is known to have succeeded. */
export interface SubmittedTransaction {
  txHash: string;
}

/** Outcome of a transaction once the chain has finalised it. */
export interface TransactionReceipt {
  txHash: string;
  success: boolean;
  blockNumber: number | null;
}

/**
 * Custody and signing. Implemented by the Privy adapter.
 *
 * @remarks Implementations must never return, log or accept a private key,
 * seed phrase or signed-payload secret.
 */
export interface WalletProvider {
  /** Short provider name recorded on the wallet row, for example `privy`. */
  readonly name: string;
  /** Creates a wallet the provider custodies on the organization's behalf. */
  createWallet(input: {
    orgId: string;
    agentId: string;
    chain: ChainId;
  }): Promise<ProvisionedWallet>;
  /**
   * Reveals the compressed public key behind a wallet address.
   *
   * @remarks Exists for wallets provisioned before the key was recorded, and
   * for providers that cannot return it at creation time.
   */
  publicKeyFor(input: { providerWalletId: string; address: string }): Promise<string>;
  /** Signs and broadcasts a value transfer. */
  sendPayment(input: SendPaymentInput): Promise<SubmittedTransaction>;
  /**
   * Associates the wallet with a token so it can hold and receive it.
   *
   * @remarks Hedera-specific and deliberately explicit. Unlike other EVM
   * chains, a Hedera account cannot receive a token it has not opted into, so
   * this is a real transaction rather than a no-op. Implementations for chains
   * without the concept should resolve without broadcasting anything.
   */
  associateToken(input: AssociateTokenInput): Promise<SubmittedTransaction | null>;
}

/** Instruction to opt a managed wallet into holding a token. */
export interface AssociateTokenInput {
  providerWalletId: string;
  address: string;
  asset: AssetId;
  chain: ChainId;
  idempotencyKey: string;
}

/** Chain reads and settlement confirmation. Implemented by the Hedera adapter. */
export interface ChainProvider {
  readonly chain: ChainId;
  /** Spendable balance of `asset` held by `address`, in base units. */
  getBalance(address: string, asset: AssetId): Promise<bigint>;
  /** Polls until the transaction is final or the deadline passes. */
  waitForReceipt(txHash: string, timeoutMs?: number): Promise<TransactionReceipt>;
  /** Human-facing explorer link for an operator or a judge to click. */
  explorerUrl(txHash: string): string;
  /**
   * Whether `address` has opted into holding `asset`.
   *
   * @returns `true` or `false` for a token, or `null` when the question does
   *   not apply, either because the asset is the chain's native currency or
   *   because the chain has no association concept.
   */
  isTokenAssociated(address: string, asset: AssetId): Promise<boolean | null>;
}

/** One value transfer as indexed by the analytics provider. */
export interface IndexedTransfer {
  txHash: string;
  from: string;
  to: string;
  /** Amount in the asset's base units. */
  amount: bigint;
  asset: AssetId;
  blockTimestamp: Date;
}

/** Filter accepted by {@link AnalyticsProvider.getTransfers}. */
export interface TransferQuery {
  address: string;
  since: Date;
  until: Date;
  limit?: number;
}

/** On-chain observability. Implemented by The Graph adapter. */
export interface AnalyticsProvider {
  readonly name: string;
  /** Transfers involving `address` in the window, newest first. */
  getTransfers(query: TransferQuery): Promise<IndexedTransfer[]>;
  /** Whether the provider is backed by a live index or a local fallback. */
  isLive(): boolean;
}

/** One independently-sourced price for an asset. */
export interface PriceQuote {
  /** Price of one whole unit of the asset, in USD cents. */
  usdCentsPerUnit: number;
  /** Which product produced it, for the audit trail. */
  source: string;
}

/** The composed result of pricing an asset. */
export interface PriceResult {
  /** Agreed price in USD cents per whole unit, or `null` when unusable. */
  usdCentsPerUnit: number | null;
  /** Every quote consulted, including ones that disagreed. */
  quotes: PriceQuote[];
  /** Why a price could not be agreed, when `usdCentsPerUnit` is `null`. */
  disagreementReason?: string;
}

/**
 * Live asset pricing, used to bound a payment's value rather than its token
 * count.
 *
 * @remarks Implementations must fail closed. Returning a guess when sources
 * disagree would make a USD ceiling advisory, which is worse than not having
 * one, because an operator would believe they were protected.
 */
export interface MarketDataProvider {
  readonly name: string;
  /** Whether this provider reads live data or is a stand-in. */
  isLive(): boolean;
  /**
   * Prices one whole unit of an asset.
   *
   * @param asset - Asset ticker to price.
   * @returns The composed result, with `null` when sources could not agree.
   */
  priceUsdCents(asset: AssetId): Promise<PriceResult>;
}

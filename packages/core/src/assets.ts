/**
 * The asset and chain registry.
 *
 * Pocket only moves assets it knows the decimal precision of, because guessing
 * precision is a money bug. Adding an asset here is a deliberate act.
 */

/** Chains Pocket can settle on. */
export const CHAINS = ['hedera-testnet', 'hedera-mainnet'] as const;

/** Union of supported chain identifiers. */
export type ChainId = (typeof CHAINS)[number];

/** Assets Pocket can price and move. */
export const ASSETS = ['USDC', 'HBAR'] as const;

/** Union of supported asset identifiers. */
export type AssetId = (typeof ASSETS)[number];

/** Static description of an asset's on-chain representation. */
export interface AssetSpec {
  /** Ticker used throughout the API. */
  readonly id: AssetId;
  /** Number of base units per whole unit, as a power of ten. */
  readonly decimals: number;
  /** Human label for dashboards. */
  readonly label: string;
}

/** Decimal precision per supported asset. */
export const ASSET_SPECS: Readonly<Record<AssetId, AssetSpec>> = {
  USDC: { id: 'USDC', decimals: 6, label: 'USD Coin' },
  HBAR: { id: 'HBAR', decimals: 8, label: 'HBAR' },
};

/**
 * Looks up an asset's precision.
 *
 * @param asset - Supported asset identifier.
 * @returns The number of decimal places the asset supports.
 */
export function decimalsOf(asset: AssetId): number {
  return ASSET_SPECS[asset].decimals;
}

/** Narrows an arbitrary string to a supported asset identifier. */
export function isAssetId(value: string): value is AssetId {
  return (ASSETS as readonly string[]).includes(value);
}

/** Narrows an arbitrary string to a supported chain identifier. */
export function isChainId(value: string): value is ChainId {
  return (CHAINS as readonly string[]).includes(value);
}

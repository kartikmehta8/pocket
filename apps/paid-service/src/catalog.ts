/**
 * The resources this seller offers.
 *
 * Everything here is backed by a live upstream, so what an agent buys is what
 * a developer would buy: current prices, current fees, current aggregates.
 * Prices are per call and set in the same range commercial providers charge,
 * which is what makes the demo a plausible transaction rather than a token
 * gesture.
 */

import type { SourceCache } from './cache.js';
import type { SellerConfig } from './config.js';
import { chainTvl, stablecoins } from './sources/defi.js';
import { marketPrices } from './sources/market.js';
import { networkGas } from './sources/network.js';
import { researchSources } from './sources/research.js';
import type { DataSource } from './sources/types.js';

/** Feeds that talk to an upstream, and the composed feeds that read them. */
export interface CatalogStages {
  /** Fetched from an upstream API. Warmed first. */
  raw: DataSource[];
  /** Assembled from the raw snapshots. Warmed second. */
  composed: DataSource[];
}

/**
 * Every feed this seller can offer, in warming order.
 *
 * @param cache - The cache the composed research products read from.
 * @param config - Seller configuration, supplying the two research prices.
 * @returns The raw feeds and the composed ones, separately.
 * @remarks The split is not cosmetic. A composed feed reads the raw feeds'
 *   snapshots, so warming them in one undifferentiated batch would race.
 */
export function catalogStages(cache: SourceCache, config: SellerConfig): CatalogStages {
  return {
    raw: [marketPrices, networkGas, chainTvl, stablecoins],
    composed: researchSources(cache, {
      brief: config.PAID_SERVICE_PRICE,
      deep: config.PAID_SERVICE_PREMIUM_PRICE,
    }),
  };
}

/**
 * Converts a decimal price to the asset's base units.
 *
 * @param price - Decimal string, for example `"0.08"`.
 * @param decimals - Precision of the settlement asset.
 * @returns Base units as a string, which is what x402 requirements carry.
 * @throws {Error} When the price carries more precision than the asset allows.
 */
export function toBaseUnits(price: string, decimals: number): string {
  const [whole = '0', fraction = ''] = price.split('.');
  if (fraction.length > decimals) {
    throw new Error(`Price ${price} exceeds ${decimals} decimal places.`);
  }
  return BigInt(whole + fraction.padEnd(decimals, '0')).toString();
}

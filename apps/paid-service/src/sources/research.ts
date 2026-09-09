/**
 * Composed research products.
 *
 * These are the ones that justify a higher price: the buyer pays once and gets
 * an answer assembled from every other feed, rather than paying four times and
 * joining the results themselves. That is exactly what a research API sells.
 *
 * They read from the cache rather than the network, so a brief never depends
 * on an upstream being reachable at the moment someone pays for it.
 */

import type { SourceCache } from '../cache.js';
import { chainTvl, stablecoins } from './defi.js';
import { marketPrices, type MarketPrices } from './market.js';
import { networkGas, type NetworkGas } from './network.js';
import type { DataSource } from './types.js';

/** The market brief payload. */
export interface EthBrief {
  headline: string;
  prices: MarketPrices['quotes'];
  fees: NetworkGas;
  topChains: Array<{ name: string; tvlUsd: number }>;
  sources: string[];
}

/**
 * Reads a warmed snapshot, or fails loudly.
 *
 * @param cache - The warmed cache.
 * @param id - Source identifier.
 * @returns The stored payload. Untyped on purpose: the caller states the shape
 *   it expects, so the assertion is visible at the point it is made rather
 *   than hidden behind a generic.
 * @throws {Error} When the feed never warmed, which cannot happen for a feed
 *   the seller is offering — the catalog excludes those.
 */
function readSnapshot(cache: SourceCache, id: string): unknown {
  const snapshot = cache.snapshot(id);
  if (snapshot === null) throw new Error(`Feed ${id} has no snapshot.`);
  return snapshot.data;
}

/** Describes fee conditions in a sentence a person can act on. */
function feeNarrative(gas: NetworkGas): string {
  if (gas.gasPriceGwei < 5) return 'Fees are low; batch work now.';
  if (gas.gasPriceGwei < 25) return 'Fees are ordinary.';
  return 'Fees are elevated; defer anything that can wait.';
}

/** Describes the market in a sentence, from the majors' 24-hour moves. */
function marketNarrative(prices: MarketPrices): string {
  const majors = prices.quotes.filter((quote) => ['ETH', 'BTC'].includes(quote.symbol));
  const moves = majors.map((quote) => quote.change24hPercent ?? 0);
  const average = moves.length === 0 ? 0 : moves.reduce((a, b) => a + b, 0) / moves.length;
  if (average > 2) return 'Majors are up sharply over 24 hours.';
  if (average < -2) return 'Majors are down sharply over 24 hours.';
  return 'Majors are flat over 24 hours.';
}

/**
 * Builds the two composed research products.
 *
 * @param cache - The warmed cache the briefs read from.
 * @param prices - Prices for the standard and deep tiers, from configuration,
 *   because those two are what the demo's budgets are calibrated against.
 * @returns Both research feeds.
 */
export function researchSources(
  cache: SourceCache,
  prices: { brief: string; deep: string },
): DataSource[] {
  const brief: DataSource<EthBrief> = {
    id: 'research-brief',
    path: '/v1/research/eth-brief',
    title: 'Ethereum market brief',
    description: 'Prices, fee conditions and chain TVL joined into one briefing.',
    useCase: 'A single call that answers "what is going on right now" for an agent.',
    provider: 'Composed from CoinGecko, publicnode and DefiLlama',
    price: prices.brief,
    ttlMs: 5 * 60_000,
    load: () => {
      const market = readSnapshot(cache, marketPrices.id) as MarketPrices;
      const gas = readSnapshot(cache, networkGas.id) as NetworkGas;
      const chains = readSnapshot(cache, chainTvl.id) as {
        chains: Array<{ name: string; tvlUsd: number }>;
      };

      return Promise.resolve({
        headline: `${marketNarrative(market)} ${feeNarrative(gas)}`,
        prices: market.quotes,
        fees: gas,
        topChains: chains.chains.slice(0, 5),
        sources: ['CoinGecko', 'publicnode.com', 'DefiLlama'],
      });
    },
  };

  const deep: DataSource = {
    id: 'research-deep',
    path: '/v1/research/deep-dive',
    title: 'Full ecosystem deep dive',
    description: 'Everything in the brief, plus the full chain and stablecoin tables.',
    useCase: 'Periodic reporting where the underlying tables matter, not just the summary.',
    provider: 'Composed from CoinGecko, publicnode and DefiLlama',
    price: prices.deep,
    ttlMs: 5 * 60_000,
    load: async () => ({
      ...(await brief.load()),
      chains: (readSnapshot(cache, chainTvl.id) as { chains: unknown[] }).chains,
      stablecoins: (readSnapshot(cache, stablecoins.id) as { stablecoins: unknown[] }).stablecoins,
    }),
  };

  return [brief, deep];
}

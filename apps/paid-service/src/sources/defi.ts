/**
 * Chain and stablecoin aggregates from DefiLlama.
 *
 * The comparative numbers behind almost every "which chain should we deploy
 * on" conversation, and behind treasury reporting on stablecoin exposure.
 * Both are expensive to compute yourself and cheap to buy per call.
 */

import { fetchJson, type DataSource } from './types.js';

/** How many rows each resource returns, ranked by size. */
const CHAIN_LIMIT = 25;
const STABLECOIN_LIMIT = 15;

/** DefiLlama's chain row. */
interface LlamaChain {
  name: string;
  tokenSymbol: string | null;
  tvl: number | null;
  chainId: number | null;
}

/** DefiLlama's pegged-asset row. */
interface LlamaStablecoin {
  name: string;
  symbol: string;
  pegType: string;
  pegMechanism: string;
  circulating?: Record<string, number>;
}

/** One chain's total value locked. */
export interface ChainTvl {
  name: string;
  symbol: string | null;
  chainId: number | null;
  tvlUsd: number;
}

/** One stablecoin's circulating supply. */
export interface StablecoinSupply {
  name: string;
  symbol: string;
  pegType: string;
  /** How the peg is maintained: fiat-backed, crypto-backed, algorithmic. */
  pegMechanism: string;
  circulatingUsd: number;
}

/** Rounds to whole dollars. */
function usd(value: number): number {
  return Math.round(value);
}

/** Total value locked across the largest chains. */
export const chainTvl: DataSource<{ chains: ChainTvl[]; totalUsd: number }> = {
  id: 'defi-chains',
  path: '/v1/defi/chains',
  title: 'Chain TVL leaderboard',
  description: `Total value locked on the top ${CHAIN_LIMIT} chains, ranked.`,
  useCase: 'Comparing ecosystems before choosing where to deploy or integrate.',
  provider: 'DefiLlama',
  price: '0.05',
  ttlMs: 10 * 60_000,
  async load() {
    const rows = await fetchJson<LlamaChain[]>('https://api.llama.fi/v2/chains');
    const chains = rows
      .filter((row): row is LlamaChain & { tvl: number } => typeof row.tvl === 'number')
      .sort((a, b) => b.tvl - a.tvl)
      .slice(0, CHAIN_LIMIT)
      .map((row) => ({
        name: row.name,
        symbol: row.tokenSymbol,
        chainId: row.chainId,
        tvlUsd: usd(row.tvl),
      }));

    if (chains.length === 0) throw new Error('DefiLlama returned no chains with a TVL.');
    return { chains, totalUsd: usd(chains.reduce((sum, chain) => sum + chain.tvlUsd, 0)) };
  },
};

/** Circulating supply of the largest stablecoins. */
export const stablecoins: DataSource<{
  stablecoins: StablecoinSupply[];
  totalCirculatingUsd: number;
}> = {
  id: 'defi-stablecoins',
  path: '/v1/defi/stablecoins',
  title: 'Stablecoin supply',
  description: `Circulating supply and peg mechanism for the top ${STABLECOIN_LIMIT} stablecoins.`,
  useCase: 'Treasury reporting, and sizing counterparty exposure by peg mechanism.',
  provider: 'DefiLlama',
  price: '0.08',
  ttlMs: 15 * 60_000,
  async load() {
    const body = await fetchJson<{ peggedAssets: LlamaStablecoin[] }>(
      'https://stablecoins.llama.fi/stablecoins',
    );

    const ranked = body.peggedAssets
      .map((asset) => ({
        name: asset.name,
        symbol: asset.symbol,
        pegType: asset.pegType,
        pegMechanism: asset.pegMechanism,
        // `circulating` is keyed by peg type, so the figure is read by the
        // asset's own peg rather than assumed to be dollars.
        circulatingUsd: usd(asset.circulating?.[asset.pegType] ?? 0),
      }))
      .filter((asset) => asset.circulatingUsd > 0)
      .sort((a, b) => b.circulatingUsd - a.circulatingUsd)
      .slice(0, STABLECOIN_LIMIT);

    if (ranked.length === 0) throw new Error('DefiLlama returned no circulating stablecoins.');
    return {
      stablecoins: ranked,
      totalCirculatingUsd: usd(ranked.reduce((sum, asset) => sum + asset.circulatingUsd, 0)),
    };
  },
};

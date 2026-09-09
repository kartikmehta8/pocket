/**
 * Spot prices from CoinGecko.
 *
 * The single most-bought piece of data in crypto: what is this worth right
 * now. Any application that shows a fiat total — a wallet, a checkout, an
 * invoice, a treasury dashboard — needs it, and none of them can compute it
 * themselves.
 */

import { fetchJson, type DataSource } from './types.js';

/** Assets quoted, by CoinGecko id. HBAR is here because Purse settles on Hedera. */
const ASSETS: ReadonlyArray<{ id: string; symbol: string }> = [
  { id: 'ethereum', symbol: 'ETH' },
  { id: 'bitcoin', symbol: 'BTC' },
  { id: 'hedera-hashgraph', symbol: 'HBAR' },
  { id: 'solana', symbol: 'SOL' },
  { id: 'usd-coin', symbol: 'USDC' },
  { id: 'tether', symbol: 'USDT' },
];

/** CoinGecko's response shape for `simple/price`. */
type SimplePrice = Record<
  string,
  { usd?: number; usd_market_cap?: number; usd_24h_change?: number }
>;

/** One quoted asset, as this seller serves it. */
export interface Quote {
  symbol: string;
  priceUsd: number;
  marketCapUsd: number | null;
  change24hPercent: number | null;
}

/** The prices payload. */
export interface MarketPrices {
  quotes: Quote[];
  vsCurrency: 'usd';
}

const ENDPOINT =
  'https://api.coingecko.com/api/v3/simple/price' +
  `?ids=${ASSETS.map((asset) => asset.id).join(',')}` +
  '&vs_currencies=usd&include_market_cap=true&include_24hr_change=true';

/**
 * Rounds a number to a fixed precision, or returns `null` when absent.
 *
 * @param value - Raw value from the upstream.
 * @param places - Decimal places to keep.
 * @returns The rounded value, or `null`.
 */
function round(value: number | undefined, places: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** Live spot prices for six major assets. */
export const marketPrices: DataSource<MarketPrices> = {
  id: 'market-prices',
  path: '/v1/market/prices',
  title: 'Spot prices',
  description: 'USD price, market cap and 24-hour change for six major assets.',
  useCase: 'Rendering a fiat total in a wallet, checkout or invoice.',
  provider: 'CoinGecko',
  price: '0.01',
  ttlMs: 60_000,
  async load(): Promise<MarketPrices> {
    const body = await fetchJson<SimplePrice>(ENDPOINT);
    const quotes = ASSETS.flatMap(({ id, symbol }) => {
      const entry = body[id];
      const priceUsd = round(entry?.usd, 6);
      // An asset the upstream did not quote is omitted rather than sent as
      // zero. A missing price and a price of nothing are different facts.
      if (entry === undefined || priceUsd === null) return [];
      return [
        {
          symbol,
          priceUsd,
          marketCapUsd: round(entry.usd_market_cap, 0),
          change24hPercent: round(entry.usd_24h_change, 2),
        },
      ];
    });

    if (quotes.length === 0) throw new Error('CoinGecko returned no usable quotes.');
    return { quotes, vsCurrency: 'usd' };
  },
};

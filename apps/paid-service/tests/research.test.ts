/**
 * The two feeds assembled from the others.
 *
 * These read snapshots rather than upstreams, which is why the cache warms in
 * stages: a composed feed whose inputs have not loaded has nothing to sell, and
 * it says so rather than serving a briefing with holes in it. It says so by
 * throwing before it returns a promise, which the cache catches like any other
 * load failure.
 *
 * The narratives are the part worth pinning. They are the sentence a buyer acts
 * on, and each boundary — quiet fees against busy ones, a flat market against a
 * moving one — is a different piece of advice.
 */

import { describe, expect, it } from 'vitest';

import { SourceCache } from '../src/cache.js';
import { researchSources } from '../src/sources/research.js';
import type { DataSource } from '../src/sources/types.js';

const PRICES = { brief: '0.08', deep: '0.75' };

/** A source that answers with whatever it was handed. */
function fixed(id: string, path: string, data: unknown): DataSource {
  return {
    id,
    path,
    title: id,
    description: id,
    useCase: id,
    provider: 'test',
    price: '0.01',
    ttlMs: 60_000,
    load: () => Promise.resolve(data),
  };
}

/** A cache warmed with the four raw feeds the briefs read. */
async function warmed(options: { gasGwei?: number; change?: number } = {}): Promise<SourceCache> {
  const cache = new SourceCache(() => undefined);
  await cache.warm(
    [
      [
        fixed('market-prices', '/v1/market/prices', {
          quotes: [
            { symbol: 'ETH', priceUsd: 2484, change24hPercent: options.change ?? 0 },
            { symbol: 'BTC', priceUsd: 64_000, change24hPercent: options.change ?? 0 },
            { symbol: 'SOL', priceUsd: 140, change24hPercent: 50 },
          ],
          vsCurrency: 'usd',
        }),
        fixed('network-gas', '/v1/network/gas', {
          chain: 'ethereum',
          blockNumber: 1,
          gasPriceGwei: options.gasGwei ?? 12,
          baseFeeGwei: 1,
          blockUtilisation: 0.5,
          blockTimestamp: '2026-09-12T00:00:00.000Z',
        }),
        fixed('defi-chains', '/v1/defi/chains', {
          chains: Array.from({ length: 8 }, (_, i) => ({
            name: `chain-${String(i)}`,
            tvlUsd: 8 - i,
          })),
          totalUsd: 36,
        }),
        fixed('defi-stablecoins', '/v1/defi/stablecoins', {
          stablecoins: [{ symbol: 'USDT', circulatingUsd: 1 }],
        }),
      ],
    ],
    { attempts: 1, retryDelayMs: 0 },
  );
  return cache;
}

/** The brief and the deep dive, in that order. */
function sources(cache: SourceCache): [DataSource, DataSource] {
  const [brief, deep] = researchSources(cache, PRICES);
  if (brief === undefined || deep === undefined) throw new Error('Expected two feeds.');
  return [brief, deep];
}

describe('the brief', () => {
  it('joins the three feeds into one briefing', async () => {
    const [brief] = sources(await warmed());
    const result = (await brief.load()) as {
      headline: string;
      prices: unknown[];
      topChains: unknown[];
      sources: string[];
    };

    expect(result.prices).toHaveLength(3);
    expect(result.sources).toEqual(['CoinGecko', 'publicnode.com', 'DefiLlama']);
    expect(result.headline).toBeTruthy();
  });

  it('shows only the leading chains, not the whole table', async () => {
    const [brief] = sources(await warmed());
    const result = (await brief.load()) as { topChains: unknown[] };

    expect(result.topChains).toHaveLength(5);
  });

  it('takes its price from configuration', async () => {
    const [brief, deep] = sources(await warmed());

    expect(brief.price).toBe('0.08');
    expect(deep.price).toBe('0.75');
  });

  it('reads the market from the majors, not from whatever moved most', async () => {
    const [up] = sources(await warmed({ change: 5 }));
    const [down] = sources(await warmed({ change: -5 }));
    const [flat] = sources(await warmed({ change: 0 }));

    expect(((await up.load()) as { headline: string }).headline).toMatch(/up sharply/);
    expect(((await down.load()) as { headline: string }).headline).toMatch(/down sharply/);
    expect(((await flat.load()) as { headline: string }).headline).toMatch(/flat/);
  });

  it('turns fee conditions into advice', async () => {
    const [quiet] = sources(await warmed({ gasGwei: 2 }));
    const [ordinary] = sources(await warmed({ gasGwei: 12 }));
    const [busy] = sources(await warmed({ gasGwei: 40 }));

    expect(((await quiet.load()) as { headline: string }).headline).toMatch(/batch work now/);
    expect(((await ordinary.load()) as { headline: string }).headline).toMatch(/ordinary/);
    expect(((await busy.load()) as { headline: string }).headline).toMatch(/defer anything/);
  });

  it('refuses to serve a briefing whose inputs never warmed', () => {
    const [brief] = sources(new SourceCache(() => undefined));
    expect(() => brief.load()).toThrow(/has no snapshot/);
  });
});

describe('the deep dive', () => {
  it('carries everything the brief has, plus the full tables', async () => {
    const [, deep] = sources(await warmed());
    const result = (await deep.load()) as {
      headline: string;
      topChains: unknown[];
      chains: unknown[];
      stablecoins: unknown[];
    };

    expect(result.headline).toBeTruthy();
    expect(result.topChains).toHaveLength(5);
    expect(result.chains).toHaveLength(8);
    expect(result.stablecoins).toHaveLength(1);
  });
});

/**
 * Pricing an asset by making two sources agree.
 *
 * A single price source is a single thing to manipulate: if an agent's ceiling
 * is set in dollars, whoever controls the price controls the ceiling. So two
 * independent products are asked and required to agree within a tolerance.
 *
 * When they disagree, or either is unavailable, there is no price at all. The
 * provider does not fall back to one source and does not use a stale figure,
 * because a dollar limit that quietly becomes a guess is not a limit. The
 * agreeing pair resolves to the lower of the two, so a ceiling never lets more
 * value through than the most conservative source would have allowed.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { GraphMarketDataProvider } from './graph-market.js';

const USDC = '0x0000000000000000000000000000000000068cda';

/** A provider wired to both products, with a two-percent tolerance. */
function provider(toleranceBps = 200): GraphMarketDataProvider {
  return new GraphMarketDataProvider({
    tokenApiUrl: 'https://api.pinax.network',
    tokenApiJwt: 'jwt',
    subgraphUrl: 'https://gateway.example/subgraphs/id/x',
    subgraphApiKey: 'key',
    network: 'mainnet',
    toleranceBps,
    contracts: { USDC },
    pools: { USDC: '0xPOOL' },
  });
}

/**
 * Answers the Token API and the subgraph in turn.
 *
 * @param tokenApi - Close price in dollars, or `null` to fail the request.
 * @param subgraph - Dollar price, or `null` to fail the request.
 */
function sources(tokenApi: number | null, subgraph: number | null): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string | URL) => {
      const isTokenApi = String(url).includes('pinax');
      const value = isTokenApi ? tokenApi : subgraph;
      if (value === null) {
        return Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve(
            isTokenApi
              ? { data: [{ close: value }] }
              : { data: { token: { derivedETH: value }, bundle: { ethPriceUSD: 1 } } },
          ),
      });
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('priceUsdCents', () => {
  it('agrees a price the two sources both support', async () => {
    sources(1, 1);
    const result = await provider().priceUsdCents('USDC');

    expect(result.usdCentsPerUnit).toBe(100);
    expect(result.quotes).toHaveLength(2);
    expect(result.disagreementReason).toBeUndefined();
  });

  it('takes the lower of two agreeing quotes', async () => {
    sources(1.01, 1);
    expect((await provider().priceUsdCents('USDC')).usdCentsPerUnit).toBe(100);
  });

  it('refuses when the two disagree beyond tolerance', async () => {
    sources(1, 2);
    const result = await provider().priceUsdCents('USDC');

    expect(result.usdCentsPerUnit).toBeNull();
    expect(result.disagreementReason).toMatch(/disagreed by \d+ bps/);
  });

  it('refuses rather than trusting the one source that answered', async () => {
    sources(1, null);
    const result = await provider().priceUsdCents('USDC');

    expect(result.usdCentsPerUnit).toBeNull();
    expect(result.quotes).toHaveLength(1);
    expect(result.disagreementReason).toMatch(/Fewer than two price sources/);
  });

  it('refuses when neither source answers', async () => {
    sources(null, null);
    const result = await provider().priceUsdCents('USDC');

    expect(result.usdCentsPerUnit).toBeNull();
    expect(result.quotes).toHaveLength(0);
  });

  it('refuses a price of nothing, which is not a price', async () => {
    sources(0, 1);
    expect((await provider().priceUsdCents('USDC')).usdCentsPerUnit).toBeNull();
  });

  it('refuses a GraphQL error rather than reading past it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string | URL) =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve(
              String(url).includes('pinax')
                ? { data: [{ close: 1 }] }
                : { errors: [{ message: 'indexer is behind' }] },
            ),
        }),
      ),
    );

    expect((await provider().priceUsdCents('USDC')).usdCentsPerUnit).toBeNull();
  });

  it('refuses an asset it was given no contract for, rather than pricing another', async () => {
    sources(1, 1);
    await expect(provider().priceUsdCents('HBAR')).rejects.toThrow(/No price contract/);
  });

  it('asks the subgraph alone when no pool is configured for the asset', async () => {
    sources(1, 1);
    const noPool = new GraphMarketDataProvider({
      tokenApiUrl: 'https://api.pinax.network',
      tokenApiJwt: 'jwt',
      subgraphUrl: 'https://gateway.example/subgraphs/id/x',
      subgraphApiKey: 'key',
      network: 'mainnet',
      toleranceBps: 200,
      contracts: { USDC },
      pools: {},
    });
    const result = await noPool.priceUsdCents('USDC');

    expect(result.quotes).toHaveLength(1);
    expect(result.usdCentsPerUnit).toBeNull();
  });

  it('lowercases the pool address, because a checksummed one is answered 500', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const mixed = new GraphMarketDataProvider({
      tokenApiUrl: 'https://api.pinax.network',
      tokenApiJwt: 'jwt',
      subgraphUrl: 'https://gateway.example/subgraphs/id/x',
      subgraphApiKey: 'key',
      network: 'mainnet',
      toleranceBps: 200,
      contracts: { USDC },
      pools: { USDC: '0xAbCdEf0123456789' },
    });
    await mixed.priceUsdCents('USDC');

    const called = fetchMock.mock.calls.map((call) => String((call as unknown[])[0])).join(' ');
    expect(called).toContain('0xabcdef0123456789');
    expect(called).not.toContain('0xAbCdEf0123456789');
  });

  it('says it is live, because it reads both products for real', () => {
    expect(provider().isLive()).toBe(true);
  });
});

/**
 * What each feed makes of what its upstream said.
 *
 * The upstreams are mocked, because this is not a test of CoinGecko. What is
 * under test is the mapping: a hex quantity becoming gwei, a price that was
 * never quoted being omitted rather than sent as zero, a supply read by the
 * asset's own peg rather than assumed to be dollars, and a feed that got
 * nothing usable failing loudly instead of selling an empty answer.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { chainTvl, stablecoins } from '../src/sources/defi.js';
import { marketPrices } from '../src/sources/market.js';
import { networkGas } from '../src/sources/network.js';

/** Answers every fetch with `body`, or with a status when one is given. */
function upstream(body: unknown, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(body),
      }),
    ),
  );
}

/** Answers each call in turn, for a feed that makes more than one. */
function upstreams(bodies: unknown[]): void {
  let call = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      const body = bodies[call++];
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('marketPrices', () => {
  it('quotes what the upstream priced', async () => {
    upstream({
      ethereum: { usd: 2484.1234567, usd_market_cap: 298_000_000_000.7, usd_24h_change: -1.2349 },
    });
    const result = await marketPrices.load();

    expect(result.vsCurrency).toBe('usd');
    expect(result.quotes).toContainEqual({
      symbol: 'ETH',
      priceUsd: 2484.123457,
      marketCapUsd: 298_000_000_001,
      change24hPercent: -1.23,
    });
  });

  it('omits an asset the upstream did not price rather than calling it zero', async () => {
    upstream({ ethereum: { usd: 2484.13 }, bitcoin: {} });
    const result = await marketPrices.load();

    expect(result.quotes.map((q) => q.symbol)).toEqual(['ETH']);
    expect(result.quotes[0]?.marketCapUsd).toBeNull();
    expect(result.quotes[0]?.change24hPercent).toBeNull();
  });

  it('fails rather than selling an empty answer', async () => {
    upstream({});
    await expect(marketPrices.load()).rejects.toThrow(/no usable quotes/);
  });

  it('fails when the upstream refuses, naming the host and not the URL', async () => {
    upstream({}, 503);
    await expect(marketPrices.load()).rejects.toThrow(/answered 503/);
  });
});

describe('networkGas', () => {
  const block = {
    number: '0x14a3f',
    baseFeePerGas: '0x3b9aca00',
    gasUsed: '0xf4240',
    gasLimit: '0x1e8480',
    timestamp: '0x66000000',
  };

  it('reads hex quantities as gwei and a utilisation fraction', async () => {
    upstreams([
      { jsonrpc: '2.0', id: 1, result: '0x77359400' },
      { jsonrpc: '2.0', id: 1, result: block },
    ]);
    const result = await networkGas.load();

    expect(result.chain).toBe('ethereum');
    expect(result.gasPriceGwei).toBe(2);
    expect(result.baseFeeGwei).toBe(1);
    expect(result.blockNumber).toBe(84_543);
    expect(result.blockUtilisation).toBeCloseTo(0.5, 5);
    expect(new Date(result.blockTimestamp).toISOString()).toBe(result.blockTimestamp);
  });

  it('reports no base fee for a chain that has none', async () => {
    const { baseFeePerGas: _omitted, ...legacy } = block;
    upstreams([
      { jsonrpc: '2.0', id: 1, result: '0x77359400' },
      { jsonrpc: '2.0', id: 1, result: legacy },
    ]);

    expect((await networkGas.load()).baseFeeGwei).toBeNull();
  });

  it('surfaces a JSON-RPC error rather than treating it as a result', async () => {
    upstreams([{ jsonrpc: '2.0', id: 1, error: { message: 'method not found' } }]);
    await expect(networkGas.load()).rejects.toThrow(/method not found/);
  });

  it('fails when the node answers without a result', async () => {
    upstreams([{ jsonrpc: '2.0', id: 1 }]);
    await expect(networkGas.load()).rejects.toThrow(/returned no result/);
  });
});

describe('chainTvl', () => {
  it('ranks chains by locked value and totals them', async () => {
    upstream([
      { name: 'Solana', tokenSymbol: 'SOL', chainId: null, tvl: 8_000_000_000 },
      { name: 'Ethereum', tokenSymbol: 'ETH', chainId: 1, tvl: 50_000_000_000.4 },
    ]);
    const result = await chainTvl.load();

    expect(result.chains.map((c) => c.name)).toEqual(['Ethereum', 'Solana']);
    expect(result.chains[0]?.tvlUsd).toBe(50_000_000_000);
    expect(result.totalUsd).toBe(58_000_000_000);
  });

  it('drops a chain whose value the upstream did not report', async () => {
    upstream([
      { name: 'Ethereum', tokenSymbol: 'ETH', chainId: 1, tvl: 1 },
      { name: 'Ghost', tokenSymbol: null, chainId: null, tvl: null },
    ]);

    expect((await chainTvl.load()).chains.map((c) => c.name)).toEqual(['Ethereum']);
  });

  it('fails when nothing has a value, rather than selling an empty table', async () => {
    upstream([]);
    await expect(chainTvl.load()).rejects.toThrow(/no chains/);
  });
});

describe('stablecoins', () => {
  it('reads each supply by the asset’s own peg', async () => {
    upstream({
      peggedAssets: [
        {
          name: 'Tether',
          symbol: 'USDT',
          pegType: 'peggedUSD',
          pegMechanism: 'fiat-backed',
          circulating: { peggedUSD: 110_000_000_000, peggedEUR: 5 },
        },
        {
          name: 'Euro Coin',
          symbol: 'EURC',
          pegType: 'peggedEUR',
          pegMechanism: 'fiat-backed',
          circulating: { peggedEUR: 90_000_000 },
        },
      ],
    });
    const result = await stablecoins.load();

    expect(result.stablecoins[0]).toMatchObject({
      symbol: 'USDT',
      circulatingUsd: 110_000_000_000,
    });
    expect(result.stablecoins[1]).toMatchObject({ symbol: 'EURC', circulatingUsd: 90_000_000 });
  });

  it('drops an asset whose peg carries no figure', async () => {
    upstream({
      peggedAssets: [
        { name: 'Ghost', symbol: 'GH', pegType: 'peggedUSD', pegMechanism: 'algorithmic' },
        {
          name: 'Tether',
          symbol: 'USDT',
          pegType: 'peggedUSD',
          pegMechanism: 'fiat-backed',
          circulating: { peggedUSD: 1 },
        },
      ],
    });

    expect((await stablecoins.load()).stablecoins.map((s) => s.symbol)).toEqual(['USDT']);
  });

  it('fails when nothing is circulating', async () => {
    upstream({ peggedAssets: [] });
    await expect(stablecoins.load()).rejects.toThrow();
  });
});

import { describe, expect, it } from 'vitest';

import { providerMarks } from './providers';

describe('providerMarks', () => {
  it('matches a single vendor by name', () => {
    expect(providerMarks('CoinGecko')).toEqual([
      { name: 'CoinGecko', logo: '/logos/coingecko.png' },
    ]);
  });

  it('cleans up a technical provider line to the vendor behind it', () => {
    expect(providerMarks('publicnode.com JSON-RPC').map((m) => m.name)).toEqual(['PublicNode']);
  });

  it('splits a composed feed into its vendors, in the order named', () => {
    expect(
      providerMarks('Composed from CoinGecko, publicnode and DefiLlama').map((m) => m.name),
    ).toEqual(['CoinGecko', 'PublicNode', 'DefiLlama']);
  });

  it('keeps an unknown provider as text with no mark', () => {
    expect(providerMarks('Acme Weather')).toEqual([{ name: 'Acme Weather', logo: null }]);
  });
});

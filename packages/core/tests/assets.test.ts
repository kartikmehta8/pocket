/**
 * The assets and chains Pocket is willing to handle.
 *
 * A ticker that reaches the engine without being recognised is a ticker whose
 * precision nothing knows, and precision is what keeps money off a float. The
 * guards exist so an unrecognised string is refused at the edge rather than
 * defaulted somewhere deeper.
 */

import { describe, expect, it } from 'vitest';

import { ASSETS, ASSET_SPECS, CHAINS, decimalsOf, isAssetId, isChainId } from '../src/assets.js';

describe('decimalsOf', () => {
  it('gives USDC six places and HBAR eight', () => {
    expect(decimalsOf('USDC')).toBe(6);
    expect(decimalsOf('HBAR')).toBe(8);
  });

  it('has a spec for every asset it claims to support', () => {
    for (const asset of ASSETS) {
      expect(ASSET_SPECS[asset]).toBeDefined();
      expect(ASSET_SPECS[asset].decimals).toBeGreaterThan(0);
    }
  });
});

describe('isAssetId', () => {
  it('accepts every supported ticker', () => {
    for (const asset of ASSETS) expect(isAssetId(asset)).toBe(true);
  });

  it('refuses a ticker nothing knows the precision of', () => {
    expect(isAssetId('ETH')).toBe(false);
    expect(isAssetId('usdc')).toBe(false);
    expect(isAssetId('')).toBe(false);
  });
});

describe('isChainId', () => {
  it('accepts every supported chain', () => {
    for (const chain of CHAINS) expect(isChainId(chain)).toBe(true);
  });

  it('refuses anything else', () => {
    expect(isChainId('ethereum')).toBe(false);
    expect(isChainId('hedera')).toBe(false);
    expect(isChainId('')).toBe(false);
  });
});

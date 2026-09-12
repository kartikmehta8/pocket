/**
 * Turning a price into what the protocol carries.
 *
 * x402 requirements are in base units, and the catalogue quotes decimals, so
 * something has to convert between them. Doing that through a float is how a
 * seller quotes 0.07999999999999999, and refusing a price with more precision
 * than the asset has is how it avoids quoting one it cannot be paid.
 */

import { describe, expect, it } from 'vitest';

import { catalogStages, toBaseUnits } from '../src/catalog.js';
import { SourceCache } from '../src/cache.js';
import type { SellerConfig } from '../src/config.js';

describe('toBaseUnits', () => {
  it('scales a decimal price to base units', () => {
    expect(toBaseUnits('0.01', 6)).toBe('10000');
    expect(toBaseUnits('0.08', 6)).toBe('80000');
    expect(toBaseUnits('0.75', 6)).toBe('750000');
    expect(toBaseUnits('1', 6)).toBe('1000000');
  });

  it('handles a price with no fractional part and one with the full precision', () => {
    expect(toBaseUnits('12', 6)).toBe('12000000');
    expect(toBaseUnits('0.123456', 6)).toBe('123456');
  });

  it('is exact where a float would not be', () => {
    expect(toBaseUnits('0.1', 6)).toBe('100000');
    expect(toBaseUnits('0.3', 6)).toBe('300000');
    expect(toBaseUnits('1234567.891234', 6)).toBe('1234567891234');
  });

  it('refuses a price the asset cannot represent', () => {
    expect(() => toBaseUnits('0.1234567', 6)).toThrow(/exceeds 6 decimal places/);
  });

  it('works for an asset with different precision', () => {
    expect(toBaseUnits('1', 8)).toBe('100000000');
    expect(toBaseUnits('0.00000001', 8)).toBe('1');
  });

  it('scales nothing when the asset has no decimals', () => {
    expect(toBaseUnits('5', 0)).toBe('5');
    expect(() => toBaseUnits('5.1', 0)).toThrow();
  });
});

describe('catalogStages', () => {
  const config = { PAID_SERVICE_PRICE: '0.08', PAID_SERVICE_PREMIUM_PRICE: '0.75' };

  it('separates the feeds that fetch from the feeds that read them', () => {
    const stages = catalogStages(new SourceCache(() => undefined), config as SellerConfig);

    expect(stages.raw.length).toBeGreaterThan(0);
    expect(stages.composed.length).toBeGreaterThan(0);
    for (const source of stages.composed) {
      expect(stages.raw).not.toContain(source);
    }
  });

  it('gives every feed the shape the cache and the catalogue need', () => {
    const stages = catalogStages(new SourceCache(() => undefined), config as SellerConfig);

    for (const source of [...stages.raw, ...stages.composed]) {
      expect(source.id, source.id).toBeTruthy();
      expect(source.path.startsWith('/'), source.path).toBe(true);
      expect(source.price, source.id).toMatch(/^\d+(\.\d+)?$/);
      expect(source.ttlMs, source.id).toBeGreaterThan(0);
      expect(source.title, source.id).toBeTruthy();
      expect(source.provider, source.id).toBeTruthy();
    }
  });

  it('prices the composed feeds from configuration', () => {
    const stages = catalogStages(new SourceCache(() => undefined), config as SellerConfig);
    const prices = stages.composed.map((source) => source.price);

    expect(prices).toContain('0.08');
    expect(prices).toContain('0.75');
  });

  it('gives every feed its own path, so two cannot answer the same request', () => {
    const stages = catalogStages(new SourceCache(() => undefined), config as SellerConfig);
    const paths = [...stages.raw, ...stages.composed].map((source) => source.path);

    expect(new Set(paths).size).toBe(paths.length);
  });
});

/**
 * Money arithmetic, which never touches a float.
 */

import { describe, expect, it } from 'vitest';
import { formatAmount, parseAmount, remaining, sum } from '../src/money.js';
import { PocketError } from '../src/errors.js';

describe('parseAmount', () => {
  it('parses whole and fractional amounts at the asset precision', () => {
    expect(parseAmount('1', 6)).toBe(1_000_000n);
    expect(parseAmount('0.08', 6)).toBe(80_000n);
    expect(parseAmount('12.345678', 6)).toBe(12_345_678n);
    expect(parseAmount('0', 6)).toBe(0n);
  });

  it('parses zero-decimal assets', () => {
    expect(parseAmount('42', 0)).toBe(42n);
  });

  it('rejects more precision than the asset supports', () => {
    expect(() => parseAmount('0.1234567', 6)).toThrow(PocketError);
  });

  it('rejects signs, whitespace, empties and scientific notation', () => {
    for (const bad of ['-1', ' 1', '1 ', '', '1e6', '.5', '1.', 'abc', '1,5']) {
      expect(() => parseAmount(bad, 6), bad).toThrow(PocketError);
    }
  });

  it('round-trips through formatAmount', () => {
    for (const value of ['0', '0.08', '1', '12.345678', '999999.999999']) {
      expect(formatAmount(parseAmount(value, 6), 6)).toBe(value);
    }
  });
});

describe('formatAmount', () => {
  it('trims trailing zeros but keeps significant digits', () => {
    expect(formatAmount(80_000n, 6)).toBe('0.08');
    expect(formatAmount(1_000_000n, 6)).toBe('1');
    expect(formatAmount(1n, 6)).toBe('0.000001');
    expect(formatAmount(0n, 6)).toBe('0');
  });

  it('formats negative amounts', () => {
    expect(formatAmount(-80_000n, 6)).toBe('-0.08');
  });

  it('handles zero-decimal assets', () => {
    expect(formatAmount(42n, 0)).toBe('42');
  });
});

describe('remaining', () => {
  it('clamps at zero rather than returning a negative allowance', () => {
    expect(remaining(100n, 40n)).toBe(60n);
    expect(remaining(100n, 100n)).toBe(0n);
    expect(remaining(100n, 140n)).toBe(0n);
  });
});

describe('sum', () => {
  it('adds 0.1 and 0.2 to exactly 0.3, which floats cannot', () => {
    expect(sum([parseAmount('0.1', 6), parseAmount('0.2', 6)])).toBe(parseAmount('0.3', 6));
    expect(sum([])).toBe(0n);
  });
});

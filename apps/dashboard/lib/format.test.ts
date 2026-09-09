import { describe, expect, it } from 'vitest';

import { EMPTY, formatMoney, sumMoney, truncateAddress, usageRatio } from './format';

describe('formatMoney', () => {
  it('groups thousands and pads the fraction', () => {
    expect(formatMoney('1284.4')).toBe('1,284.40');
  });

  it('never rounds away significant digits it was not asked to keep', () => {
    expect(formatMoney('0.089', 2)).toBe('0.08');
  });

  it('renders a dash for missing values', () => {
    expect(formatMoney(null)).toBe(EMPTY);
  });
});

describe('sumMoney', () => {
  it('adds decimal strings exactly', () => {
    expect(sumMoney(['0.1', '0.2'])).toBe('0.30');
  });

  it('ignores unreadable entries', () => {
    expect(sumMoney(['1.00', undefined, 'n/a', '2.50'])).toBe('3.50');
  });
});

describe('usageRatio', () => {
  it('clamps to one when over budget', () => {
    expect(usageRatio('12', '10')).toBe(1);
  });

  it('returns zero when the limit is zero', () => {
    expect(usageRatio('5', '0')).toBe(0);
  });
});

describe('truncateAddress', () => {
  it('keeps the head and tail of a long address', () => {
    expect(truncateAddress('0x1234567890abcdef1234')).toBe('0x1234…1234');
  });
});

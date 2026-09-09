/**
 * Explorer links.
 *
 * A receipt nobody can open is not a receipt. These links are what a judge or
 * an auditor clicks to check that a payment really happened, so the identifier
 * has to be in the form the explorer reads.
 */

import { describe, expect, it } from 'vitest';
import { toExplorerId } from './hedera.js';

describe('explorer identifiers', () => {
  it('rewrites the form a facilitator reports into the form explorers read', () => {
    expect(toExplorerId('0.0.7162784@1788960276.971429192')).toBe(
      '0.0.7162784-1788960276-971429192',
    );
  });

  it('leaves an already-dashed id alone', () => {
    expect(toExplorerId('0.0.7162784-1788960276-971429192')).toBe(
      '0.0.7162784-1788960276-971429192',
    );
  });

  it('leaves an EVM hash alone, dots and all', () => {
    const hash = '0x27768f998d030d43a9bc005d64e65f18f47f894e8cbfa2d1362dc11c8ba5c6ca';
    expect(toExplorerId(hash)).toBe(hash);
  });

  it('only splits the fractional separator, not the account dots', () => {
    // 0.0.123 must survive intact; only the timestamp's dot becomes a dash.
    expect(toExplorerId('0.0.123@1.2')).toBe('0.0.123-1-2');
  });
});

/**
 * Identifier minting.
 *
 * Identifiers are always minted here and never accepted from a client, so the
 * only things worth pinning are that they carry their type prefix and that two
 * of them are never the same. The API key format matters more: the prefix is
 * what is stored alongside the hash, and it has to be long enough to recognise
 * a key by and short enough to be useless on its own.
 */

import { describe, expect, it } from 'vitest';

import { apiKeyPrefix, newApiKey, newId } from '../src/ids.js';

describe('newId', () => {
  it('carries the type prefix, so a stray id in a log describes itself', () => {
    expect(newId('pay')).toMatch(/^pay_[0-9a-f]{16}$/);
    expect(newId('agent')).toMatch(/^agent_[0-9a-f]{16}$/);
  });

  it('does not repeat itself', () => {
    const minted = new Set(Array.from({ length: 500 }, () => newId('pay')));
    expect(minted.size).toBe(500);
  });
});

describe('newApiKey', () => {
  it('is recognisable by its prefix', () => {
    expect(newApiKey().startsWith('pocket_sk_')).toBe(true);
  });

  it('does not repeat itself', () => {
    const minted = new Set(Array.from({ length: 200 }, () => newApiKey()));
    expect(minted.size).toBe(200);
  });

  it('carries more entropy than the prefix reveals', () => {
    const key = newApiKey();
    expect(key.length).toBeGreaterThan(apiKeyPrefix(key).length + 32);
  });
});

describe('apiKeyPrefix', () => {
  it('keeps enough to recognise a key by', () => {
    const key = newApiKey();
    expect(apiKeyPrefix(key)).toBe(key.slice(0, 16));
    expect(apiKeyPrefix(key).startsWith('pocket_sk_')).toBe(true);
  });

  it('keeps little enough to be useless on its own', () => {
    const key = newApiKey();
    expect(apiKeyPrefix(key).length).toBeLessThan(key.length / 2);
  });
});

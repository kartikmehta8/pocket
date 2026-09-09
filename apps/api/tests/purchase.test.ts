/**
 * The purchase surface.
 *
 * Two things are worth proving here and cannot be proved by the x402 tests:
 * that a caller cannot aim the API's outbound fetch at an internal address,
 * and that the derived idempotency key changes when the price does.
 */

import { describe, expect, it } from 'vitest';
import { PocketError } from '@pocket/core';
import { isPrivateHost, parseResourceUrl } from '../src/services/resource-url.js';
import { purchaseIdempotencyKey } from '../src/services/x402-idempotency.js';

describe('private host detection', () => {
  it.each([
    'localhost',
    '127.0.0.1',
    '10.1.2.3',
    '192.168.0.5',
    '172.16.4.4',
    '169.254.169.254',
    '100.64.0.1',
    'db.internal',
    'app.localhost',
  ])('treats %s as private', (host) => {
    expect(isPrivateHost(host)).toBe(true);
  });

  it.each(['api.coingecko.com', 'example.com', '8.8.8.8', '172.15.0.1', '172.32.0.1'])(
    'treats %s as public',
    (host) => {
      expect(isPrivateHost(host)).toBe(false);
    },
  );
});

describe('resource url parsing', () => {
  it('refuses a private host when the deployment does not allow one', () => {
    expect(() => parseResourceUrl('http://localhost:8402/v1/data', false)).toThrow(PocketError);
  });

  it('allows a private host when the deployment does allow one', () => {
    const url = parseResourceUrl('http://localhost:8402/v1/data', true);
    expect(url.hostname).toBe('localhost');
  });

  it('refuses a non-http scheme even when private hosts are allowed', () => {
    expect(() => parseResourceUrl('file:///etc/passwd', true)).toThrow(PocketError);
    expect(() => parseResourceUrl('ftp://example.com/x', true)).toThrow(PocketError);
  });

  it('refuses something that is not a URL at all', () => {
    expect(() => parseResourceUrl('not a url', true)).toThrow(PocketError);
  });

  it('accepts a public https resource', () => {
    const url = parseResourceUrl('https://api.example.com/v1/prices?x=1', false);
    expect(url.toString()).toBe('https://api.example.com/v1/prices?x=1');
  });
});

describe('purchase idempotency', () => {
  const base = ['agent_1', 'https://seller/v1/prices', '', '10000'];

  it('is stable for the same purchase', () => {
    expect(purchaseIdempotencyKey(base)).toBe(purchaseIdempotencyKey([...base]));
  });

  it('changes when the price changes', () => {
    // A seller that reprices is quoting a different purchase. Replaying the
    // cheaper payment against it would hand over data nobody paid for.
    expect(purchaseIdempotencyKey(base)).not.toBe(
      purchaseIdempotencyKey(['agent_1', 'https://seller/v1/prices', '', '20000']),
    );
  });

  it('changes when the task budget changes', () => {
    expect(purchaseIdempotencyKey(base)).not.toBe(
      purchaseIdempotencyKey(['agent_1', 'https://seller/v1/prices', 'task_9', '10000']),
    );
  });

  it('separates two agents buying the same thing', () => {
    expect(purchaseIdempotencyKey(base)).not.toBe(
      purchaseIdempotencyKey(['agent_2', 'https://seller/v1/prices', '', '10000']),
    );
  });
});

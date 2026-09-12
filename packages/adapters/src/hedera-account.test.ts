/**
 * Reading a Hedera account from its EVM address.
 *
 * Two questions, deliberately answered by two functions. `resolveHederaAccount`
 * answers "can this be signed for", where a hollow account plus a key Pocket
 * already holds is fine. `readHederaAccountState` answers "what does the rest
 * of the world see", where it is not — and at least one faucet refuses to send
 * to an account whose key it cannot read, which is what strands an operator at
 * the funding step.
 *
 * An outage is not the same fact as an absent account. Collapsing the two tells
 * an operator to go and fund a wallet that is already funded.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { PocketError } from '@pocket/core';

import { readHederaAccountState, resolveHederaAccount } from './hedera-account.js';

const MIRROR = 'https://testnet.mirrornode.hedera.com';
const ADDRESS = '0x1f9D1adc7C5121C419883fef05000B1003B4e182';
const KEY = '0x02e4f1a1f5d3d4c4b1dd2b7f1e0b6f2a7e3d8c9a0b1c2d3e4f5061728394a5b6c7d';

/** Answers the mirror node with `body`, or with `status` when it is not 200. */
function mirror(body: unknown, status = 200): void {
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolveHederaAccount', () => {
  it('uses a key the caller already holds, without asking the chain for one', async () => {
    mirror({ account: '0.0.123', evm_address: ADDRESS.toLowerCase(), key: null });
    const result = await resolveHederaAccount(MIRROR, ADDRESS, KEY);

    expect(result.accountId).toBe('0.0.123');
    expect(result.evmAddress).toBe(ADDRESS.toLowerCase());
    expect(result.publicKey).toBeDefined();
  });

  it('reads the key off the account when the caller has none', async () => {
    mirror({
      account: '0.0.123',
      evm_address: ADDRESS.toLowerCase(),
      key: { _type: 'ECDSA_SECP256K1', key: KEY.slice(2) },
    });

    expect((await resolveHederaAccount(MIRROR, ADDRESS)).accountId).toBe('0.0.123');
  });

  it('falls back to the address it was given when the node echoes none', async () => {
    mirror({ account: '0.0.123', key: null });

    expect((await resolveHederaAccount(MIRROR, ADDRESS, KEY)).evmAddress).toBe(ADDRESS);
  });

  it('reports a hollow account as such, not as the wrong key type', async () => {
    mirror({ account: '0.0.123', key: null });

    await expect(resolveHederaAccount(MIRROR, ADDRESS)).rejects.toThrow(/hollow/);
  });

  it('names the key type when a Privy wallet could never sign for it', async () => {
    mirror({ account: '0.0.123', key: { _type: 'ED25519', key: 'abc' } });

    await expect(resolveHederaAccount(MIRROR, ADDRESS)).rejects.toThrow(/not secp256k1/);
  });

  it('reports no account when the node has never seen one', async () => {
    mirror({}, 404);

    await expect(resolveHederaAccount(MIRROR, ADDRESS)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('reports no account id when the node answers without one', async () => {
    mirror({ evm_address: ADDRESS });

    await expect(resolveHederaAccount(MIRROR, ADDRESS)).rejects.toThrow(/no account id/);
  });

  it('does not double the slash when the base URL carries one', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ account: '0.0.1' }) }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await resolveHederaAccount(`${MIRROR}/`, ADDRESS, KEY);

    const [first] = fetchMock.mock.calls as unknown as [[unknown]];
    expect(String(first[0])).toBe(`${MIRROR}/api/v1/accounts/${ADDRESS}`);
  });
});

describe('readHederaAccountState', () => {
  it('reports a published key', async () => {
    mirror({ account: '0.0.123', key: { _type: 'ECDSA_SECP256K1', key: 'abc' } });

    expect(await readHederaAccountState(MIRROR, ADDRESS)).toEqual({
      accountId: '0.0.123',
      keyPublished: true,
    });
  });

  it('reports a hollow account rather than refusing to answer', async () => {
    mirror({ account: '0.0.123', key: null });

    expect(await readHederaAccountState(MIRROR, ADDRESS)).toEqual({
      accountId: '0.0.123',
      keyPublished: false,
    });
  });

  it('answers null when there is no account yet', async () => {
    mirror({}, 404);

    expect(await readHederaAccountState(MIRROR, ADDRESS)).toBeNull();
  });

  it('answers null when the node returns a body with no account', async () => {
    mirror({ evm_address: ADDRESS });

    expect(await readHederaAccountState(MIRROR, ADDRESS)).toBeNull();
  });

  it('throws on an outage rather than calling it an absent account', async () => {
    mirror({}, 503);

    await expect(readHederaAccountState(MIRROR, ADDRESS)).rejects.toBeInstanceOf(PocketError);
    await expect(readHederaAccountState(MIRROR, ADDRESS)).rejects.toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
    });
  });
});

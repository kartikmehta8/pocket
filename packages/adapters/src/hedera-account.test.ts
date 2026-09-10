/**
 * Resolving the account that will pay.
 *
 * A Hedera account created by a transfer has published no public key until it
 * signs something, so asking the chain for one fails on exactly the first
 * payment. Supplying a key the caller already holds is what removes that
 * chicken and egg.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { PocketError } from '@pocket/core';
import { resolveHederaAccount } from './hedera-account.js';

const EVM = '0x4F811318436eb3222CE2A955fb90Fa00C9192CDC';
const ACCOUNT = '0.0.10445834';
const PUBLIC_KEY = '0x0347cf067202307502596556cd194bebce36e2db01776bb6295cb0fa3f3e56e5c9';

/** Answers the mirror node with one account body. */
function mirrorReturns(body: unknown, ok = true): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) } as never),
  );
}

/** A hollow account: real id, no key, exactly what the mirror node returns. */
const HOLLOW = { account: ACCOUNT, evm_address: EVM.toLowerCase(), key: null };

/** The same account once it has signed something. */
const COMPLETED = {
  account: ACCOUNT,
  evm_address: EVM.toLowerCase(),
  key: { _type: 'ECDSA_SECP256K1', key: PUBLIC_KEY.slice(2) },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolving a Hedera account', () => {
  it('resolves a hollow account when the key is supplied', async () => {
    mirrorReturns(HOLLOW);

    const resolved = await resolveHederaAccount('https://mirror.test', EVM, PUBLIC_KEY);

    expect(resolved.accountId).toBe(ACCOUNT);
    expect(resolved.publicKey.toStringRaw()).toBe(PUBLIC_KEY.slice(2));
  });

  it('refuses a hollow account when no key is supplied', async () => {
    mirrorReturns(HOLLOW);

    await expect(resolveHederaAccount('https://mirror.test', EVM)).rejects.toThrow(
      /published a public key/,
    );
  });

  it('still reads the key from the chain when none is supplied', async () => {
    mirrorReturns(COMPLETED);

    const resolved = await resolveHederaAccount('https://mirror.test', EVM);

    expect(resolved.publicKey.toStringRaw()).toBe(PUBLIC_KEY.slice(2));
  });

  it('prefers the supplied key over the published one', async () => {
    mirrorReturns(COMPLETED);

    const resolved = await resolveHederaAccount('https://mirror.test', EVM, PUBLIC_KEY);

    expect(resolved.publicKey.toStringRaw()).toBe(PUBLIC_KEY.slice(2));
  });

  it('still needs the account to exist, key or no key', async () => {
    mirrorReturns({ _status: { messages: [{ message: 'Not found' }] } }, false);

    await expect(resolveHederaAccount('https://mirror.test', EVM, PUBLIC_KEY)).rejects.toThrow(
      PocketError,
    );
  });
});

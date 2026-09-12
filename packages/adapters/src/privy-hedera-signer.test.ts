/**
 * Signing a Hedera transfer without ever holding a key.
 *
 * The signer produces a partly signed transaction and never broadcasts it. The
 * facilitator has to co-sign and submit, which is what makes a compromised
 * Pocket unable to move money on its own — and what makes the facilitator the
 * fee payer, so the agent never needs gas.
 *
 * The public key is supplied rather than looked up wherever the caller already
 * holds it. Until an account has signed something the chain has no key on file
 * for it, so a lookup would fail on exactly the transaction that would have
 * fixed that.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { SigningKey, Wallet, getBytes } from 'ethers';
import { PocketError } from '@pocket/core';

import { HBAR_ASSET_ID } from '@x402/hedera';

import { createPrivyHederaSigner } from './privy-hedera-signer.js';
import type { HederaPaymentRequirements } from './privy-hedera-signer.js';

const MIRROR = 'https://testnet.mirrornode.hedera.com';
const FEE_PAYER = '0.0.800';

/** A wallet whose key the test holds, so it can sign as Privy would. */
const key = new SigningKey(Wallet.createRandom().privateKey);

/** Answers the mirror node with an account id and no key on file. */
function hollowAccount(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ account: '0.0.1234', evm_address: '0xabc' }),
      }),
    ),
  );
}

/** Signs a digest the way Privy does: 65 bytes, recovery id last. */
function signDigest(digest: `0x${string}`): Promise<string> {
  return Promise.resolve(key.sign(digest).serialized);
}

/** A signer wired to the fixture wallet. */
function signer(overrides: Partial<Parameters<typeof createPrivyHederaSigner>[0]> = {}) {
  return createPrivyHederaSigner({
    signDigest: (_walletId: string, digest: `0x${string}`) => signDigest(digest),
    walletId: 'w_1',
    evmAddress: '0x1f9D1adc7C5121C419883fef05000B1003B4e182',
    network: 'hedera:testnet',
    mirrorNodeUrl: MIRROR,
    publicKey: key.compressedPublicKey,
    ...overrides,
  } as Parameters<typeof createPrivyHederaSigner>[0]);
}

/** A requirement for one USDC, payable by the facilitator. */
function requirements(overrides: Partial<HederaPaymentRequirements> = {}) {
  return {
    asset: '0.0.429274',
    amount: '10000',
    payTo: '0.0.5678',
    network: 'hedera:testnet',
    extra: { feePayer: FEE_PAYER },
    ...overrides,
  } as HederaPaymentRequirements;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createPrivyHederaSigner', () => {
  it('resolves the account id the transfer is addressed from', async () => {
    hollowAccount();

    expect((await signer()).accountId).toBe('0.0.1234');
  });

  it('signs a token transfer and hands back bytes rather than broadcasting', async () => {
    hollowAccount();
    const signed = await (await signer()).createPartiallySignedTransferTransaction(requirements());

    expect(typeof signed).toBe('string');
    expect(Buffer.from(signed, 'base64').length).toBeGreaterThan(0);
  });

  it('signs a native transfer the same way', async () => {
    hollowAccount();
    const signed = await (
      await signer()
    ).createPartiallySignedTransferTransaction(requirements({ asset: HBAR_ASSET_ID }));

    expect(Buffer.from(signed, 'base64').length).toBeGreaterThan(0);
  });

  it('drops the recovery byte, because Hedera wants r and s alone', async () => {
    hollowAccount();
    const seen: number[] = [];
    const spy = await signer({
      signDigest: async (_walletId: string, digest: `0x${string}`) => {
        const signature = await signDigest(digest);
        seen.push(getBytes(signature).length);
        return signature;
      },
    } as never);
    await spy.createPartiallySignedTransferTransaction(requirements());

    expect(seen).toContain(65);
  });

  it('refuses a requirement that names no fee payer', async () => {
    hollowAccount();
    const built = await signer();

    await expect(
      built.createPartiallySignedTransferTransaction(requirements({ extra: {} })),
    ).rejects.toBeInstanceOf(PocketError);
  });

  it('refuses an amount of nothing, which is not a payment', async () => {
    hollowAccount();
    const built = await signer();

    await expect(
      built.createPartiallySignedTransferTransaction(requirements({ amount: '0' })),
    ).rejects.toThrow(/greater than zero/);
  });
});

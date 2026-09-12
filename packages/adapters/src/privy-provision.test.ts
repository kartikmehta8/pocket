/**
 * The three things Pocket asks Privy to do.
 *
 * Create a wallet, broadcast a transaction, sign a digest. Nothing here holds a
 * key: a wallet comes back as an id and a public address, and a signature comes
 * back on its own.
 *
 * What each of these has to get right is the failure. Privy's own wallet policy
 * denies calls, and a denial that reached the caller as a raw SDK exception
 * would tell an operator nothing, so each one is translated into a Pocket error
 * with a code the API already knows how to answer with.
 */

import { describe, expect, it, vi } from 'vitest';
import type { PrivyClient } from '@privy-io/server-auth';

import { provisionPrivyWallet, sendPrivyTransaction, signPrivyDigest } from './privy-provision.js';

/** The three calls this package makes, captured so a case can assert on them. */
interface Calls {
  createWallet: ReturnType<typeof vi.fn>;
  sendTransaction: ReturnType<typeof vi.fn>;
  secp256k1Sign: ReturnType<typeof vi.fn>;
}

/** A Privy client whose three calls answer however a case needs. */
function privy(overrides: {
  createWallet?: unknown;
  sendTransaction?: unknown;
  secp256k1Sign?: unknown;
}): { client: PrivyClient; calls: Calls } {
  const resolve = (value: unknown) =>
    value instanceof Error ? vi.fn().mockRejectedValue(value) : vi.fn().mockResolvedValue(value);
  const calls: Calls = {
    createWallet: resolve(overrides.createWallet),
    sendTransaction: resolve(overrides.sendTransaction),
    secp256k1Sign: resolve(overrides.secp256k1Sign),
  };
  const client = {
    walletApi: {
      createWallet: calls.createWallet,
      ethereum: {
        sendTransaction: calls.sendTransaction,
        secp256k1Sign: calls.secp256k1Sign,
      },
    },
  } as unknown as PrivyClient;
  return { client, calls };
}

const TRANSACTION = { to: '0x1' as const, value: '0x0' as const, chainId: 296 };

describe('provisionPrivyWallet', () => {
  it('returns an id and a public address, and never a secret', async () => {
    const wallet = await provisionPrivyWallet(
      privy({ createWallet: { id: 'w_1', address: '0xabc', privateKey: 'should-not-be-read' } })
        .client,
      { policyId: 'policy_1', agentId: 'agent_1' },
    );

    expect(wallet).toEqual({ id: 'w_1', address: '0xabc' });
  });

  it('attaches the policy when there is one', async () => {
    const { client, calls } = privy({ createWallet: { id: 'w_1', address: '0xabc' } });
    await provisionPrivyWallet(client, { policyId: 'policy_1', agentId: 'agent_1' });

    expect(calls.createWallet).toHaveBeenCalledWith({
      chainType: 'ethereum',
      policyIds: ['policy_1'],
    });
  });

  it('still creates a wallet when no policy could be made', async () => {
    const { client, calls } = privy({ createWallet: { id: 'w_1', address: '0xabc' } });
    await provisionPrivyWallet(client, { policyId: null, agentId: 'agent_1' });

    expect(calls.createWallet).toHaveBeenCalledWith({ chainType: 'ethereum' });
  });

  it('names the agent when Privy cannot be reached', async () => {
    await expect(
      provisionPrivyWallet(privy({ createWallet: new Error('ETIMEDOUT') }).client, {
        policyId: null,
        agentId: 'agent_1',
      }),
    ).rejects.toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
      details: { agentId: 'agent_1' },
    });
  });
});

describe('sendPrivyTransaction', () => {
  it('broadcasts through the wallet and returns the hash', async () => {
    const { client, calls } = privy({ sendTransaction: { hash: '0xdead' } });
    const result = await sendPrivyTransaction(client, {
      providerWalletId: 'w_1',
      chain: 'hedera-testnet',
      asset: 'USDC',
      idempotencyKey: 'k',
      transaction: TRANSACTION,
      refusal: 'Privy rejected the transaction.',
    });

    expect(result).toEqual({ txHash: '0xdead' });
    expect(calls.sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ walletId: 'w_1', idempotencyKey: 'k', transaction: TRANSACTION }),
    );
  });

  it("uses the caller's own words when Privy refuses", async () => {
    await expect(
      sendPrivyTransaction(privy({ sendTransaction: new Error('policy denied') }).client, {
        providerWalletId: 'w_1',
        chain: 'hedera-testnet',
        asset: 'HBAR',
        idempotencyKey: 'k',
        transaction: TRANSACTION,
        refusal: 'Privy rejected the account completion.',
      }),
    ).rejects.toMatchObject({
      code: 'PAYMENT_FAILED',
      message: 'Privy rejected the account completion.',
      details: { chain: 'hedera-testnet', asset: 'HBAR' },
    });
  });
});

describe('signPrivyDigest', () => {
  it('returns the signature and nothing else', async () => {
    const signature = `0x${'ab'.repeat(65)}`;

    await expect(
      signPrivyDigest(
        privy({ secp256k1Sign: { signature } }).client,
        'w_1',
        `0x${'11'.repeat(32)}`,
      ),
    ).resolves.toBe(signature);
  });

  it('reports a refusal as a payment failure, naming the wallet and not the key', async () => {
    await expect(
      signPrivyDigest(
        privy({ secp256k1Sign: new Error('denied') }).client,
        'w_1',
        `0x${'11'.repeat(32)}`,
      ),
    ).rejects.toMatchObject({ code: 'PAYMENT_FAILED', details: { walletId: 'w_1' } });
  });
});

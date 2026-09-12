/**
 * What happens between approval and the signature.
 *
 * A payment reaches `approved` before the wallet signs, and `approved` already
 * counts against the agent's daily spend. Signing can still fail — an account
 * the wallet cannot sign for, a mirror node that is down, Privy refusing — and
 * a reservation that outlives the attempt costs the agent budget it never
 * spent, silently and for good.
 *
 * The token address is set here rather than read from the developer’s own
 * `.env`: the seller asks to be paid in a token id, and Pocket resolves that
 * to an asset through the configured address rather than a hard-coded one. The
 * payee lookup happens before any payment exists and is not what these cases
 * are about, so it is answered from memory rather than the network. The point
 * of all of them is that a failed attempt costs the agent nothing.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';

const createPrivyHederaSigner = vi.hoisted(() => vi.fn());
const resolveHederaAccount = vi.hoisted(() => vi.fn());

vi.mock('@pocket/adapters', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@pocket/adapters')>()),
  createPrivyHederaSigner,
  resolveHederaAccount,
}));

const { getDb } = await import('@pocket/db');
const { createFundedAgent, createHarness, SELLER } = await import('./helpers.js');
const { authorizeX402Payment } = await import('../src/services/x402.js');
const { loadConfig } = await import('../src/config.js');

let h: Awaited<ReturnType<typeof createHarness>>;

beforeAll(async () => {
  vi.stubEnv('HEDERA_USDC_ADDRESS', '0x0000000000000000000000000000000000068cda');
  h = await createHarness();
  resolveHederaAccount.mockResolvedValue({
    accountId: '0.0.10425079',
    evmAddress: SELLER,
    publicKey: null,
  });
});
afterAll(async () => {
  vi.unstubAllEnvs();
  await h.app.close();
});

/** Reads spend today, which is what a stranded reservation inflates. */
async function spendToday(agentId: string): Promise<string> {
  const response = await h.app.inject({
    method: 'GET',
    url: `/v1/agents/${agentId}`,
    headers: h.auth,
  });
  return response.json().agent.spend.today;
}

describe('a wallet that cannot sign', () => {
  it('releases the reservation instead of leaving it standing', async () => {
    const agentId = await createFundedAgent(h);
    const before = await spendToday(agentId);

    createPrivyHederaSigner.mockRejectedValueOnce(
      new Error('This Hedera account has not published a public key yet.'),
    );

    const deps = {
      db: getDb(loadConfig({ ...process.env, NODE_ENV: 'test' }).DATABASE_URL),
      market: h.market,
      wallet: h.wallet,
      chain: 'hedera-testnet',
      mirrorNodeUrl: 'https://mirror-node.invalid',
    } as unknown as Parameters<typeof authorizeX402Payment>[0];

    await expect(
      authorizeX402Payment(deps, h.orgId, [randomUUID()], {
        agentId,
        requirements: {
          scheme: 'exact',
          network: 'hedera:testnet',
          amount: '10000',
          asset: '0.0.429274',
          payTo: '0.0.10425079',
        },
        resource: 'https://pay.example/v1/market/prices',
        reason: 'Signing failure regression.',
        category: 'data',
        decimals: 6,
      }),
    ).rejects.toThrow(/public key/);

    expect(await spendToday(agentId)).toBe(before);

    const listed = await h.app.inject({
      method: 'GET',
      url: '/v1/payments?limit=1',
      headers: h.auth,
    });
    expect(listed.json().payments[0].status).toBe('failed');
  });
});

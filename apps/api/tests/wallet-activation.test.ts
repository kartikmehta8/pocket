/**
 * Publishing a wallet's key on chain.
 *
 * A Hedera account created by a transfer to an address that has never signed
 * anything is hollow: it holds a balance and answers to an id, but carries no
 * key. Pocket pays from one regardless, because it records the key at
 * provisioning. Anything reading the account from outside cannot — and
 * Circle's testnet faucet refuses to send to one, which strands an operator at
 * the funding step with a `0.0.x` id that looks perfectly good and is silently
 * rejected.
 *
 * The wallet is read straight from the create response: going through the
 * detail route would need the chain mock primed before every test that only
 * wants an agent. Seeding is off by default, because these cases are about
 * publishing a key and a treasury paying out in the background would muddy
 * what they assert. The chain mock answers hollow when asked and keyed once
 * the signature is indexed, which is what the route waits for before answering
 * — so one case is deliberately given longer than the route’s own confirmation
 * window. Signing again would cost gas to achieve nothing, and a wallet Pocket
 * seeded holds USDC and nothing else: left to Privy that came back as "Privy
 * rejected the account completion", which tells an operator nothing they can
 * act on. A slow index is not a failure — the transaction is on chain either
 * way, and reporting failure would send the operator to press the button again
 * for a signature they already have. `accountHollow` is null rather than
 * false, because the two send a reader to different places.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const readHederaAccountState = vi.hoisted(() => vi.fn());

vi.mock('@pocket/adapters', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@pocket/adapters')>()),
  readHederaAccountState,
}));

import type { Harness } from './helpers.js';

const { createHarness } = await import('./helpers.js');

let h: Harness;
let other: Harness;

/** Registers an agent and returns its id and wallet address. */
async function createAgent(): Promise<{ agentId: string; address: string }> {
  const created = await h.app.inject({
    method: 'POST',
    url: '/v1/agents',
    headers: h.auth,
    payload: { name: `Agent ${Math.random().toString(36).slice(2, 8)}` },
  });
  const agent = (created.json() as { agent: { id: string; wallet: { address: string } } }).agent;
  return { agentId: agent.id, address: agent.wallet.address };
}

/** Asks the API to publish an agent wallet's key. */
function activate(agentId: string) {
  return h.app.inject({
    method: 'POST',
    url: `/v1/agents/${agentId}/wallet/activate`,
    headers: h.auth,
  });
}

beforeAll(async () => {
  h = await createHarness();
  other = await createHarness();
});
afterAll(async () => {
  await h.app.close();
  await other.app.close();
});
beforeEach(() => {
  readHederaAccountState.mockReset();
  h.config.TREASURY_WALLET_ID = undefined;
  h.config.TREASURY_ADDRESS = undefined;
  h.config.AGENT_SEED_AMOUNT = '0.02';
});

describe('wallet activation', () => {
  it('signs for a hollow account and reports the transaction', async () => {
    const { agentId, address } = await createAgent();
    readHederaAccountState
      .mockResolvedValueOnce({ accountId: '0.0.123', keyPublished: false })
      .mockResolvedValue({ accountId: '0.0.123', keyPublished: true });

    const response = await activate(agentId);

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      accountId: string;
      activated: boolean;
      txHash: string;
      alreadyActive: boolean;
      confirmed: boolean;
    };
    expect(body).toMatchObject({
      accountId: '0.0.123',
      activated: true,
      alreadyActive: false,
      confirmed: true,
    });
    expect(body.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(h.wallet.hasCompleted(address)).toBe(true);
  });

  it('leaves an account that already published its key alone', async () => {
    const { agentId, address } = await createAgent();
    readHederaAccountState.mockResolvedValue({ accountId: '0.0.123', keyPublished: true });

    const response = await activate(agentId);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ activated: false, alreadyActive: true, txHash: null });
    expect(h.wallet.hasCompleted(address)).toBe(false);
  });

  it('refuses a wallet with no HBAR, naming the gas rather than the provider', async () => {
    const { agentId, address } = await createAgent();
    h.chain.setBalance(address, 'HBAR', 0n);
    readHederaAccountState.mockResolvedValue({ accountId: '0.0.123', keyPublished: false });

    const response = await activate(agentId);

    expect(response.statusCode).toBe(400);
    const message = (response.json() as { error: { message: string } }).error.message;
    expect(message).toContain('HBAR');
    expect(message).not.toContain('Privy');
    expect(h.wallet.hasCompleted(address)).toBe(false);
  });

  it('proceeds once the wallet can pay for the signature', async () => {
    const { agentId, address } = await createAgent();
    h.chain.setBalance(address, 'HBAR', 100_000_000n);
    readHederaAccountState
      .mockResolvedValueOnce({ accountId: '0.0.123', keyPublished: false })
      .mockResolvedValue({ accountId: '0.0.123', keyPublished: true });

    expect((await activate(agentId)).statusCode).toBe(200);
    expect(h.wallet.hasCompleted(address)).toBe(true);
  });

  it('refuses when no account exists yet, and says what to do about it', async () => {
    const { agentId, address } = await createAgent();
    readHederaAccountState.mockResolvedValue(null);

    const response = await activate(agentId);

    expect(response.statusCode).toBe(400);
    expect((response.json() as { error: { message: string } }).error.message).toContain('HBAR');
    expect(h.wallet.hasCompleted(address)).toBe(false);
  });

  it('still reports the signature when the network has not caught up', async () => {
    const { agentId } = await createAgent();
    readHederaAccountState.mockResolvedValue({ accountId: '0.0.123', keyPublished: false });

    const response = await activate(agentId);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ activated: true, confirmed: false });
  }, 20_000);

  it('records the activation in the audit trail', async () => {
    const { agentId } = await createAgent();
    readHederaAccountState
      .mockResolvedValueOnce({ accountId: '0.0.123', keyPublished: false })
      .mockResolvedValue({ accountId: '0.0.123', keyPublished: true });
    await activate(agentId);

    const audit = await h.app.inject({ method: 'GET', url: '/v1/audit', headers: h.auth });
    const events = (audit.json() as { events: { action: string; subjectId: string | null }[] })
      .events;
    expect(events.some((e) => e.action === 'wallet.activated' && e.subjectId === agentId)).toBe(
      true,
    );
  });

  it('refuses an agent belonging to another organization', async () => {
    const { agentId } = await createAgent();
    readHederaAccountState.mockResolvedValue({ accountId: '0.0.123', keyPublished: true });

    const response = await h.app.inject({
      method: 'POST',
      url: `/v1/agents/${agentId}/wallet/activate`,
      headers: other.auth,
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('topping up on activation', () => {
  it('pays a wallet that ended up with nothing', async () => {
    h.config.TREASURY_WALLET_ID = 'treasury_wallet_id';
    h.config.TREASURY_ADDRESS = '0x1111111111111111111111111111111111111111';
    const { agentId, address } = await createAgent();
    h.chain.setBalance(address, 'USDC', 0n);
    readHederaAccountState
      .mockResolvedValueOnce({ accountId: '0.0.123', keyPublished: false })
      .mockResolvedValue({ accountId: '0.0.123', keyPublished: true });

    const response = await activate(agentId);

    expect((response.json() as { seed: { amount: string | null } }).seed.amount).toBe('0.02');
  });

  it('leaves a wallet that already holds something alone', async () => {
    h.config.TREASURY_WALLET_ID = 'treasury_wallet_id';
    h.config.TREASURY_ADDRESS = '0x1111111111111111111111111111111111111111';
    const { agentId, address } = await createAgent();
    h.chain.setBalance(address, 'USDC', 5_000_000n);
    readHederaAccountState.mockResolvedValue({ accountId: '0.0.123', keyPublished: true });

    const response = await activate(agentId);

    expect((response.json() as { seed: { txHash: string | null } }).seed.txHash).toBeNull();
  });
});

describe('agent detail', () => {
  it('reports a hollow account so the caller can act on it', async () => {
    const { agentId } = await createAgent();
    readHederaAccountState.mockResolvedValue({ accountId: '0.0.123', keyPublished: false });

    const detail = await h.app.inject({
      method: 'GET',
      url: `/v1/agents/${agentId}`,
      headers: h.auth,
    });

    expect(detail.json()).toMatchObject({ accountId: '0.0.123', accountHollow: true });
  });

  it('distinguishes "no account" from "an account that is unusable"', async () => {
    const { agentId } = await createAgent();
    readHederaAccountState.mockResolvedValue(null);

    const detail = await h.app.inject({
      method: 'GET',
      url: `/v1/agents/${agentId}`,
      headers: h.auth,
    });

    expect(detail.json()).toMatchObject({ accountId: null, accountHollow: null });
  });
});

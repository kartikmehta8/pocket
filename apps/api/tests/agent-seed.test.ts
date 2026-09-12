/**
 * Seeding a new agent from the treasury.
 *
 * A freshly provisioned agent can do nothing until someone funds it, and the
 * only public source of testnet USDC on Hedera rate-limits, refuses, and
 * sometimes reports success while sending nothing. Seeding from a wallet
 * Pocket controls takes that out of the operator's first five minutes.
 *
 * 0.02 USDC is 20,000 base units at six decimals. Getting that wrong is a
 * money bug no test of the happy path would notice. The idempotency key is
 * unique per attempt: keyed to the agent alone, the provider replays the first
 * outcome for that key forever, so an agent registered while the treasury was
 * empty could never be funded again even once it was refilled. A configured
 * treasury with a zero amount is a deliberate off switch rather than a
 * transfer of nothing, and the operator’s work survives an empty treasury —
 * losing a registered agent to report a shortfall the funding step already
 * explains is the worse of the two outcomes by a distance.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createHarness, type Harness } from './helpers.js';

let h: Harness;

/** The treasury this deployment pays out of. */
const TREASURY_WALLET = 'treasury_wallet_id';
const TREASURY_ADDRESS = '0x1111111111111111111111111111111111111111';

/** Registers an agent and returns the whole response body. */
async function register(): Promise<{
  agent: { id: string; wallet: { address: string } };
  seed: { amount: string | null; txHash: string | null };
}> {
  const created = await h.app.inject({
    method: 'POST',
    url: '/v1/agents',
    headers: h.auth,
    payload: { name: 'Seeded' },
  });
  expect(created.statusCode).toBe(201);
  return created.json();
}

beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h.app.close();
});
beforeEach(() => {
  h.config.TREASURY_WALLET_ID = TREASURY_WALLET;
  h.config.TREASURY_ADDRESS = TREASURY_ADDRESS;
  h.config.AGENT_SEED_AMOUNT = '0.02';
  vi.restoreAllMocks();
});

describe('seeding a new agent', () => {
  it('sends the configured amount from the treasury', async () => {
    const body = await register();

    expect(body.seed.amount).toBe('0.02');
    expect(body.seed.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    const sent = h.wallet.sent.at(-1);
    expect(sent).toMatchObject({
      providerWalletId: TREASURY_WALLET,
      to: body.agent.wallet.address,
      asset: 'USDC',
    });
  });

  it('sends base units, not the decimal string', async () => {
    await register();
    expect(h.wallet.sent.at(-1)?.amount).toBe(20_000n);
  });

  it('uses a fresh idempotency key each attempt', async () => {
    const first = await register();
    const second = await register();
    const keys = h.wallet.sent.slice(-2).map((s) => s.idempotencyKey);

    expect(keys[0]).toContain(`seed:${first.agent.id}`);
    expect(keys[1]).toContain(`seed:${second.agent.id}`);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it('audits a canonical amount, as every other money field does', async () => {
    h.config.AGENT_SEED_AMOUNT = '0.020';
    const body = await register();
    expect(body.seed.amount).toBe('0.02');
  });

  it('records it in the audit trail as the system, not the operator', async () => {
    const body = await register();
    const audit = await h.app.inject({ method: 'GET', url: '/v1/audit', headers: h.auth });
    const events = (
      audit.json() as { events: { action: string; subjectId: string | null; actorType: string }[] }
    ).events;
    const seeded = events.find(
      (e) => e.action === 'wallet.seeded' && e.subjectId === body.agent.id,
    );
    expect(seeded?.actorType).toBe('system');
  });
});

describe('when the treasury cannot pay', () => {
  it('still registers the agent', async () => {
    vi.spyOn(h.wallet, 'sendPayment').mockRejectedValue(new Error('treasury is empty'));

    const body = await register();

    expect(body.agent.id).toBeTruthy();
    expect(body.seed).toEqual({ amount: null, txHash: null });
  });

  it('records no seeding event it cannot stand behind', async () => {
    vi.spyOn(h.wallet, 'sendPayment').mockRejectedValue(new Error('treasury is empty'));
    const body = await register();

    const audit = await h.app.inject({ method: 'GET', url: '/v1/audit', headers: h.auth });
    const events = (audit.json() as { events: { action: string; subjectId: string | null }[] })
      .events;
    expect(events.some((e) => e.action === 'wallet.seeded' && e.subjectId === body.agent.id)).toBe(
      false,
    );
  });
});

describe('when no treasury is configured', () => {
  it('provisions the agent empty and says so', async () => {
    h.config.TREASURY_WALLET_ID = undefined;
    h.config.TREASURY_ADDRESS = undefined;

    const before = h.wallet.sent.length;
    const body = await register();

    expect(body.seed).toEqual({ amount: null, txHash: null });
    expect(h.wallet.sent.length).toBe(before);
  });

  it('sends nothing when the amount is zero', async () => {
    h.config.AGENT_SEED_AMOUNT = '0';

    const before = h.wallet.sent.length;
    const body = await register();

    expect(body.seed.txHash).toBeNull();
    expect(h.wallet.sent.length).toBe(before);
  });
});

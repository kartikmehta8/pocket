import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createFundedAgent, createHarness, paymentBody, type Harness } from './helpers.js';

let h: Harness;

beforeAll(async () => {
  h = await createHarness();
});

afterAll(async () => {
  await h.app.close();
});

/** Registers a bare agent and returns its id and wallet address. */
async function register(name: string): Promise<{ id: string; address: string }> {
  const response = await h.app.inject({
    method: 'POST',
    url: '/v1/agents',
    headers: h.auth,
    payload: { name },
  });
  expect(response.statusCode).toBe(201);
  const agent = response.json().agent;
  return { id: agent.id, address: agent.wallet.address };
}

/** Empties an agent's wallet, so it can be deleted without a transfer. */
function empty(address: string): void {
  h.chain.setBalance(address, 'USDC', 0n);
}

describe('POST /v1/agents/:id/transfer', () => {
  it('moves the whole balance and records it in the audit trail', async () => {
    const from = await register('Sender');
    const to = await register('Receiver');
    h.chain.setBalance(from.address, 'USDC', 5_000_000n);

    const response = await h.app.inject({
      method: 'POST',
      url: `/v1/agents/${from.id}/transfer`,
      headers: h.auth,
      payload: { toAgentId: to.id },
    });

    expect(response.statusCode).toBe(200);
    const { transfer } = response.json();
    expect(transfer.amount).toBe('5');
    expect(transfer.asset).toBe('USDC');
    expect(transfer.txHash).toMatch(/^0x[0-9a-f]{64}$/);

    const sent = h.wallet.sent.at(-1);
    expect(sent?.to).toBe(to.address);
    expect(sent?.amount).toBe(5_000_000n);

    const audit = await h.app.inject({
      method: 'GET',
      url: '/v1/audit?action=wallet&limit=5',
      headers: h.auth,
    });
    const event = audit
      .json()
      .events.find((row: { action: string }) => row.action === 'wallet.transferred');
    expect(event.subjectId).toBe(from.id);
    expect(event.payload.toAgentId).toBe(to.id);
  });

  it('refuses to move an agent’s funds to itself', async () => {
    const agent = await register('Solo');
    const response = await h.app.inject({
      method: 'POST',
      url: `/v1/agents/${agent.id}/transfer`,
      headers: h.auth,
      payload: { toAgentId: agent.id },
    });
    expect(response.statusCode).toBe(400);
  });

  it('refuses when there is nothing to move', async () => {
    const from = await register('Empty');
    const to = await register('Anyone');
    empty(from.address);

    const response = await h.app.inject({
      method: 'POST',
      url: `/v1/agents/${from.id}/transfer`,
      headers: h.auth,
      payload: { toAgentId: to.id },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('INSUFFICIENT_BALANCE');
  });
});

describe('DELETE /v1/agents/:id', () => {
  it('refuses while the wallet still holds funds, and says how much', async () => {
    const agent = await register('Loaded');
    h.chain.setBalance(agent.address, 'USDC', 3_000_000n);

    const response = await h.app.inject({
      method: 'DELETE',
      url: `/v1/agents/${agent.id}`,
      headers: h.auth,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.message).toContain('3 USDC');
  });

  it('deletes an emptied agent, and hides it from every listing', async () => {
    const agent = await register('Retiring');
    empty(agent.address);

    const deleted = await h.app.inject({
      method: 'DELETE',
      url: `/v1/agents/${agent.id}`,
      headers: h.auth,
    });
    expect(deleted.statusCode).toBe(204);

    const listed = await h.app.inject({ method: 'GET', url: '/v1/agents', headers: h.auth });
    expect(listed.json().agents.map((row: { id: string }) => row.id)).not.toContain(agent.id);

    const fetched = await h.app.inject({
      method: 'GET',
      url: `/v1/agents/${agent.id}`,
      headers: h.auth,
    });
    expect(fetched.statusCode).toBe(404);
  });

  it('keeps the payments a deleted agent made', async () => {
    const agentId = await createFundedAgent(h);
    const paid = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, 'idempotency-key': randomUUID() },
      payload: paymentBody(agentId),
    });
    expect(paid.statusCode).toBe(200);
    const paymentId = paid.json().payment.id;

    const detail = await h.app.inject({
      method: 'GET',
      url: `/v1/agents/${agentId}`,
      headers: h.auth,
    });
    empty(detail.json().agent.wallet.address);

    const deleted = await h.app.inject({
      method: 'DELETE',
      url: `/v1/agents/${agentId}`,
      headers: h.auth,
    });
    expect(deleted.statusCode).toBe(204);

    // The ledger is the point of the product. Deleting the agent must not take
    // its history with it, cascade or no cascade.
    const payments = await h.app.inject({ method: 'GET', url: '/v1/payments', headers: h.auth });
    const ids = payments.json().payments.map((row: { id: string }) => row.id);
    expect(ids).toContain(paymentId);
  });

  it('refuses to send from a wallet with no gas, and says what is missing', async () => {
    const from = await register('Gasless');
    const to = await register('Ready');
    h.chain.setBalance(from.address, 'USDC', 1_000_000n);
    // A wallet seeded by Pocket holds only USDC: purchases go through the
    // facilitator, which pays the gas. A direct transfer has no facilitator.
    h.chain.setBalance(from.address, 'HBAR', 0n);

    const response = await h.app.inject({
      method: 'POST',
      url: `/v1/agents/${from.id}/transfer`,
      headers: h.auth,
      payload: { toAgentId: to.id },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.message).toContain('no HBAR');
  });

  it('refuses to send to a wallet that cannot hold the asset', async () => {
    const from = await register('Holder');
    const to = await register('Unopted');
    h.chain.setBalance(from.address, 'USDC', 1_000_000n);
    h.chain.setAssociated(to.address, 'USDC', false);

    const response = await h.app.inject({
      method: 'POST',
      url: `/v1/agents/${from.id}/transfer`,
      headers: h.auth,
      payload: { toAgentId: to.id },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('TOKEN_NOT_ASSOCIATED');
  });

  it('deletes a funded agent when forced, recording what was left', async () => {
    // The escape hatch: a wallet with no gas cannot send, so refusing outright
    // would leave the agent undeletable.
    const agent = await register('Stuck');
    h.chain.setBalance(agent.address, 'USDC', 10_000n);

    const forced = await h.app.inject({
      method: 'DELETE',
      url: `/v1/agents/${agent.id}?force=true`,
      headers: h.auth,
    });
    expect(forced.statusCode).toBe(204);

    const audit = await h.app.inject({
      method: 'GET',
      url: '/v1/audit?action=agent&limit=5',
      headers: h.auth,
    });
    const event = audit
      .json()
      .events.find((row: { action: string; subjectId: string }) => row.subjectId === agent.id);
    expect(event.payload.fundsLeft).toBe('0.01 USDC');
    expect(event.payload.walletAddress).toBe(agent.address);
  });

  it('cannot be deleted twice', async () => {
    const agent = await register('Gone');
    empty(agent.address);
    await h.app.inject({ method: 'DELETE', url: `/v1/agents/${agent.id}`, headers: h.auth });
    const again = await h.app.inject({
      method: 'DELETE',
      url: `/v1/agents/${agent.id}`,
      headers: h.auth,
    });
    expect(again.statusCode).toBe(404);
  });

  it('cannot spend from a deleted agent', async () => {
    const agentId = await createFundedAgent(h);
    const detail = await h.app.inject({
      method: 'GET',
      url: `/v1/agents/${agentId}`,
      headers: h.auth,
    });
    empty(detail.json().agent.wallet.address);
    await h.app.inject({ method: 'DELETE', url: `/v1/agents/${agentId}`, headers: h.auth });

    const response = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, 'idempotency-key': randomUUID() },
      payload: paymentBody(agentId),
    });
    expect(response.statusCode).toBe(404);
  });
});

describe('PATCH /v1/agents/:id', () => {
  it('renames an agent, and the new name follows its payments', async () => {
    const agentId = await createFundedAgent(h);
    const paid = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, 'idempotency-key': randomUUID() },
      payload: paymentBody(agentId),
    });
    expect(paid.statusCode).toBe(200);

    const renamed = await h.app.inject({
      method: 'PATCH',
      url: `/v1/agents/${agentId}`,
      headers: h.auth,
      payload: { name: 'Renamed', description: 'Now does something else.' },
    });
    expect(renamed.statusCode).toBe(200);
    expect(renamed.json().agent.name).toBe('Renamed');
    expect(renamed.json().agent.description).toBe('Now does something else.');

    // One agent, one name. The ledger reads back under whatever it is called
    // now rather than keeping a copy of what it used to be.
    const payments = await h.app.inject({
      method: 'GET',
      url: `/v1/payments?agentId=${agentId}`,
      headers: h.auth,
    });
    expect(payments.json().payments[0].agentName).toBe('Renamed');
  });

  it('refuses an empty name', async () => {
    const agent = await register('Named');
    const response = await h.app.inject({
      method: 'PATCH',
      url: `/v1/agents/${agent.id}`,
      headers: h.auth,
      payload: { name: '' },
    });
    expect(response.statusCode).toBe(400);
  });

  it('clears a description when given an empty one', async () => {
    const agent = await register('Described');
    await h.app.inject({
      method: 'PATCH',
      url: `/v1/agents/${agent.id}`,
      headers: h.auth,
      payload: { description: 'Something' },
    });
    const cleared = await h.app.inject({
      method: 'PATCH',
      url: `/v1/agents/${agent.id}`,
      headers: h.auth,
      payload: { description: '' },
    });
    expect(cleared.json().agent.description).toBe('');
  });
});

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

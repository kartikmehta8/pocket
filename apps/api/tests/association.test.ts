/**
 * Opting a wallet into holding a token.
 *
 * Association is checked before it is attempted, so a second request broadcasts
 * nothing and spends no gas discovering the obvious.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createFundedAgent, createHarness, paymentBody, SELLER, type Harness } from './helpers.js';

let h: Harness;
const key = () => ({ 'idempotency-key': randomUUID() });

beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h.app.close();
});

describe('token association', () => {
  it('associates an agent wallet with a token', async () => {
    const agentId = await createFundedAgent(h);
    h.chain.setAssociated(SELLER, 'USDC', true);

    const detail = await h.app.inject({
      method: 'GET',
      url: `/v1/agents/${agentId}`,
      headers: h.auth,
    });
    const address = (detail.json() as { agent: { wallet: { address: string } } }).agent.wallet
      .address;
    h.chain.setAssociated(address, 'USDC', false);

    const response = await h.app.inject({
      method: 'POST',
      url: `/v1/agents/${agentId}/wallet/associate`,
      headers: h.auth,
      payload: { asset: 'USDC' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      associated: boolean;
      txHash: string;
      alreadyAssociated: boolean;
    };
    expect(body.associated).toBe(true);
    expect(body.alreadyAssociated).toBe(false);
    expect(body.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(h.wallet.hasAssociated(address, 'USDC')).toBe(true);
  });

  it('is idempotent when the wallet is already associated', async () => {
    const agentId = await createFundedAgent(h);
    const response = await h.app.inject({
      method: 'POST',
      url: `/v1/agents/${agentId}/wallet/associate`,
      headers: h.auth,
      payload: { asset: 'USDC' },
    });
    const body = response.json() as { alreadyAssociated: boolean; txHash: string | null };
    expect(body.alreadyAssociated).toBe(true);
    expect(body.txHash).toBeNull();
  });

  it('reports success without a transaction for a native asset', async () => {
    const agentId = await createFundedAgent(h);
    const response = await h.app.inject({
      method: 'POST',
      url: `/v1/agents/${agentId}/wallet/associate`,
      headers: h.auth,
      payload: { asset: 'HBAR' },
    });
    const body = response.json() as { associated: boolean; txHash: string | null };
    expect(body.associated).toBe(true);
    expect(body.txHash).toBeNull();
  });

  it('records the association in the audit trail', async () => {
    const agentId = await createFundedAgent(h);
    await h.app.inject({
      method: 'POST',
      url: `/v1/agents/${agentId}/wallet/associate`,
      headers: h.auth,
      payload: { asset: 'USDC' },
    });
    const audit = await h.app.inject({ method: 'GET', url: '/v1/audit?limit=20', headers: h.auth });
    const actions = (audit.json() as { events: Array<{ action: string }> }).events.map(
      (event) => event.action,
    );
    expect(actions).toContain('wallet.associated');
  });

  it('404s for an agent in another organization', async () => {
    const other = await createHarness();
    const agentId = await createFundedAgent(h);
    const response = await other.app.inject({
      method: 'POST',
      url: `/v1/agents/${agentId}/wallet/associate`,
      headers: other.auth,
      payload: { asset: 'USDC' },
    });
    expect(response.statusCode).toBe(404);
    await other.app.close();
  });
});

describe('paying an unassociated recipient', () => {
  it('fails the payment before broadcasting, and says why', async () => {
    const agentId = await createFundedAgent(h);
    h.chain.setAssociated(SELLER, 'USDC', false);
    const before = h.wallet.sent.length;

    const response = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentId),
    });

    const body = response.json() as {
      payment: { id: string; status: string; txHash: string | null };
    };
    expect(body.payment.status).toBe('failed');
    expect(body.payment.txHash).toBeNull();
    expect(h.wallet.sent.length).toBe(before);

    const audit = await h.app.inject({ method: 'GET', url: '/v1/audit?limit=20', headers: h.auth });
    const failure = (
      audit.json() as { events: Array<{ action: string; payload: { reason?: string } }> }
    ).events.find((event) => event.action === 'payment.failed');
    expect(failure?.payload.reason).toContain('not associated');

    h.chain.setAssociated(SELLER, 'USDC', true);
  });

  it('releases the task budget reservation when association blocks the payment', async () => {
    const agentId = await createFundedAgent(h);
    const created = await h.app.inject({
      method: 'POST',
      url: `/v1/agents/${agentId}/task-budgets`,
      headers: h.auth,
      payload: { label: 'Association test', asset: 'USDC', limit: '1' },
    });
    const taskBudgetId = (created.json() as { taskBudget: { id: string } }).taskBudget.id;

    h.chain.setAssociated(SELLER, 'USDC', false);
    await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentId, { taskBudgetId }),
    });
    h.chain.setAssociated(SELLER, 'USDC', true);

    const list = await h.app.inject({
      method: 'GET',
      url: `/v1/agents/${agentId}/task-budgets`,
      headers: h.auth,
    });
    const task = (list.json() as { taskBudgets: Array<{ spent: string }> }).taskBudgets[0];
    expect(task?.spent).toBe('0');
  });
});

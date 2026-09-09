import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createFundedAgent, createHarness, paymentBody, type Harness } from './helpers.js';

let h: Harness;
const key = () => ({ 'idempotency-key': randomUUID() });

beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h.app.close();
});

async function openTaskBudget(agentId: string, limit: string): Promise<string> {
  const response = await h.app.inject({
    method: 'POST',
    url: `/v1/agents/${agentId}/task-budgets`,
    headers: h.auth,
    payload: { label: 'Research the ETH ecosystem', asset: 'USDC', limit },
  });
  return response.json().taskBudget.id;
}

describe('task budgets', () => {
  it('reproduces the plan demo: 0.08 allowed, then 0.75 blocked with headroom', async () => {
    const agentId = await createFundedAgent(h);
    const taskBudgetId = await openTaskBudget(agentId, '0.50');

    const first = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentId, { amount: '0.08', taskBudgetId }),
    });
    const firstBody = first.json();
    expect(firstBody.payment.status).toBe('settled');
    expect(firstBody.decision.headroom.taskRemainingAfter).toBe('0.42');

    const second = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentId, { amount: '0.75', taskBudgetId }),
    });
    const secondBody = second.json();
    expect(secondBody.payment.status).toBe('blocked');
    expect(secondBody.decision.violations.map((v) => v.code)).toContain('TASK_BUDGET_EXCEEDED');
    // The agent is told what it can still afford, so it can pick a cheaper provider.
    expect(secondBody.decision.headroom.taskRemaining).toBe('0.42');
  });

  it('does not consume the task budget when a payment is blocked', async () => {
    const agentId = await createFundedAgent(h);
    const taskBudgetId = await openTaskBudget(agentId, '0.50');

    await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentId, { amount: '0.75', taskBudgetId }),
    });

    const list = await h.app.inject({
      method: 'GET',
      url: `/v1/agents/${agentId}/task-budgets`,
      headers: h.auth,
    });
    const task = list.json().taskBudgets[0];
    expect(task?.spent).toBe('0');
    expect(task?.remaining).toBe('0.5');
  });

  it('refuses a closed task budget', async () => {
    const agentId = await createFundedAgent(h);
    const taskBudgetId = await openTaskBudget(agentId, '0.50');
    await h.app.inject({
      method: 'POST',
      url: `/v1/task-budgets/${taskBudgetId}/close`,
      headers: h.auth,
    });

    const response = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentId, { amount: '0.08', taskBudgetId }),
    });
    expect(response.json().payment.status).toBe('blocked');
  });

  it('refuses a task budget belonging to another agent', async () => {
    const agentA = await createFundedAgent(h);
    const agentB = await createFundedAgent(h);
    const taskBudgetId = await openTaskBudget(agentA, '0.50');

    const response = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentB, { taskBudgetId }),
    });
    expect(response.statusCode).toBe(403);
  });

  it('escalates to a human above the approval threshold and settles once approved', async () => {
    const agentId = await createFundedAgent(h, { approvalThreshold: '0.50' });

    const response = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentId, { amount: '1' }),
    });
    const body = response.json();
    expect(body.decision.outcome).toBe('require_approval');
    expect(body.payment.status).toBe('awaiting_approval');
    expect(body.decision.approvalReasons.length).toBeGreaterThan(0);

    const approved = await h.app.inject({
      method: 'POST',
      url: `/v1/payments/${body.payment.id}/approve`,
      headers: h.auth,
      payload: { note: 'Checked with finance.' },
    });
    expect(approved.json().payment.status).toBe('settled');
  });

  it('releases the reservation when a human rejects the payment', async () => {
    const agentId = await createFundedAgent(h, { approvalThreshold: '0.50' });
    const taskBudgetId = await openTaskBudget(agentId, '2');

    const pending = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentId, { amount: '1', taskBudgetId }),
    });
    const paymentId = pending.json().payment.id;

    await h.app.inject({
      method: 'POST',
      url: `/v1/payments/${paymentId}/reject`,
      headers: h.auth,
      payload: { note: 'Not needed.' },
    });

    const list = await h.app.inject({
      method: 'GET',
      url: `/v1/agents/${agentId}/task-budgets`,
      headers: h.auth,
    });
    const task = list.json().taskBudgets[0];
    expect(task?.spent).toBe('0');
  });

  it('cannot approve a payment twice', async () => {
    const agentId = await createFundedAgent(h, { approvalThreshold: '0.50' });
    const pending = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentId, { amount: '1' }),
    });
    const paymentId = pending.json().payment.id;

    await h.app.inject({
      method: 'POST',
      url: `/v1/payments/${paymentId}/approve`,
      headers: h.auth,
      payload: {},
    });
    const again = await h.app.inject({
      method: 'POST',
      url: `/v1/payments/${paymentId}/approve`,
      headers: h.auth,
      payload: {},
    });
    expect(again.statusCode).toBe(409);
  });
});

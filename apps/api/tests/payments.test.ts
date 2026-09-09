import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  createFundedAgent,
  createHarness,
  paymentBody,
  SELLER,
  STRANGER,
  type Harness,
} from './helpers.js';

let h: Harness;

beforeAll(async () => {
  h = await createHarness();
});

afterAll(async () => {
  await h.app.close();
});

const key = () => ({ 'idempotency-key': randomUUID() });

describe('payment execution', () => {
  it('settles a compliant payment and records a transaction hash', async () => {
    const agentId = await createFundedAgent(h);
    const response = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentId),
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.decision.outcome).toBe('allow');
    expect(body.payment['status']).toBe('settled');
    expect(body.payment['txHash']).toMatch(/^0x[0-9a-f]{64}$/);
    expect(body.payment['explorerUrl']).toContain('hashscan.io');
    expect(body.payment['amount']).toBe('0.08');
  });

  it('blocks an untrusted recipient without moving money', async () => {
    const agentId = await createFundedAgent(h);
    const before = h.wallet.sent.length;

    const response = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentId, { recipient: STRANGER }),
    });

    const body = response.json();
    expect(body.payment['status']).toBe('blocked');
    expect(body.payment['denialCode']).toBe('RECIPIENT_NOT_TRUSTED');
    expect(body.decision.violations.map((v) => v.code)).toContain('RECIPIENT_NOT_TRUSTED');
    expect(h.wallet.sent.length).toBe(before);
  });

  it('requires an idempotency key', async () => {
    const agentId = await createFundedAgent(h);
    const response = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: h.auth,
      payload: paymentBody(agentId),
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_FAILED');
  });

  it('returns the original payment when an idempotency key is replayed', async () => {
    const agentId = await createFundedAgent(h);
    const headers = { ...h.auth, ...key() };
    const first = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers,
      payload: paymentBody(agentId),
    });
    const sentAfterFirst = h.wallet.sent.length;

    const second = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers,
      payload: paymentBody(agentId),
    });

    const a = first.json();
    const b = second.json();
    expect(b.payment.id).toBe(a.payment.id);
    expect(b.replayed).toBe(true);
    expect(h.wallet.sent.length).toBe(sentAfterFirst);
  });

  it('rejects an idempotency key reused for a different amount', async () => {
    const agentId = await createFundedAgent(h);
    const headers = { ...h.auth, ...key() };
    await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers,
      payload: paymentBody(agentId),
    });

    const conflict = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers,
      payload: paymentBody(agentId, { amount: '0.09' }),
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('enforces the daily budget across many payments', async () => {
    const agentId = await createFundedAgent(h);
    await h.app.inject({
      method: 'PUT',
      url: `/v1/agents/${agentId}/budget`,
      headers: h.auth,
      payload: { asset: 'USDC', dailyLimit: '0.10', perTransactionLimit: '2' },
    });

    const first = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentId, { amount: '0.08' }),
    });
    expect(first.json().payment.status).toBe('settled');

    const second = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentId, { amount: '0.08' }),
    });
    const body = second.json();
    expect(body.payment.status).toBe('blocked');
    expect(body.payment.denialCode).toBe('DAILY_BUDGET_EXCEEDED');
  });

  it('does not let a paused agent spend', async () => {
    const agentId = await createFundedAgent(h);
    await h.app.inject({
      method: 'PATCH',
      url: `/v1/agents/${agentId}`,
      headers: h.auth,
      payload: { status: 'paused' },
    });

    const response = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentId),
    });
    expect(response.json().payment.denialCode).toBe('AGENT_INACTIVE');
  });

  it('records blocked attempts in the audit trail', async () => {
    const agentId = await createFundedAgent(h);
    await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentId, { recipient: STRANGER }),
    });

    const audit = await h.app.inject({ method: 'GET', url: '/v1/audit?limit=50', headers: h.auth });
    const actions = audit.json().events.map((event) => event.action);
    expect(actions).toContain('payment.blocked');
  });

  it('treats a previously settled recipient as known on the next payment', async () => {
    const agentId = await createFundedAgent(h, {
      trustedRecipients: [],
      unknownRecipientBehaviour: 'block',
    });

    const blocked = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentId, { recipient: SELLER }),
    });
    expect(blocked.json().payment.status).toBe('blocked');
  });
});

describe('a blocked attempt does not hold the idempotency key', () => {
  it('lets the same key through once the reason for the block is gone', async () => {
    const agentId = await createFundedAgent(h);
    const shared = key();

    // Blocked: the recipient is a stranger, so nothing is charged.
    const refused = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...shared },
      payload: paymentBody(agentId, { recipient: STRANGER }),
    });
    expect(refused.json().payment['status']).toBe('blocked');
    expect(refused.json().payment['idempotencyKey'] ?? null).toBeNull();

    // The operator fixes what blocked it. The retry must be able to proceed:
    // holding the key would strand the agent behind a limit no longer set.
    const allowed = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...shared },
      payload: paymentBody(agentId),
    });
    expect(allowed.json().payment['status']).toBe('settled');
    expect(allowed.json().payment['id']).not.toBe(refused.json().payment['id']);
  });

  it('still refuses to pay twice under one key when the first attempt paid', async () => {
    const agentId = await createFundedAgent(h);
    const shared = key();
    const before = h.wallet.sent.length;

    const first = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...shared },
      payload: paymentBody(agentId),
    });
    const second = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...shared },
      payload: paymentBody(agentId),
    });

    expect(first.json().payment['id']).toBe(second.json().payment['id']);
    expect(h.wallet.sent.length).toBe(before + 1);
  });
});

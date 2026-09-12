/**
 * Dollar ceilings, and what happens when a price cannot be agreed.
 *
 * A token limit bounds a count; a dollar limit bounds value. A payment of 1.5
 * tokens is inside a two-token ceiling and still worth $60 once the token is
 * worth $40, which is the whole reason the second control exists.
 *
 * An unverifiable value is not a safe value. A tiny payment, comfortably inside
 * every token limit, is still refused when no price could be agreed.
 *
 * The authorization event carries the evidence. `payment.settled` is a later
 * event about the chain, not about the decision.
 */

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

/** Sets a policy that caps a payment's value in dollars. */
async function withUsdCeiling(agentId: string, maxUsd: string): Promise<void> {
  await h.app.inject({
    method: 'PUT',
    url: `/v1/agents/${agentId}/policy`,
    headers: h.auth,
    payload: {
      allowedAssets: ['USDC'],
      allowedChains: ['hedera-testnet'],
      allowedCategories: ['research', 'data'],
      maxTransactionAmount: '2',
      trustedRecipients: ['0x000000000000000000000000000000000000dead'],
      unknownRecipientBehaviour: 'block',
      maxUsdPerTransaction: maxUsd,
    },
  });
}

describe('USD value ceiling', () => {
  it('allows a payment worth less than the ceiling', async () => {
    const agentId = await createFundedAgent(h);
    await withUsdCeiling(agentId, '1.00');
    h.market.setPrice(100);

    const response = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentId, { amount: '0.5' }),
    });
    expect((response.json() as { payment: { status: string } }).payment.status).toBe('settled');
  });

  it('blocks a payment whose value exceeds the ceiling even though the token count does not', async () => {
    const agentId = await createFundedAgent(h);
    await withUsdCeiling(agentId, '1.00');
    h.market.setPrice(4000);

    const response = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentId, { amount: '1.5' }),
    });
    const body = response.json() as {
      payment: { status: string; denialCode: string };
      decision: { violations: Array<{ code: string; details?: Record<string, string> }> };
    };
    expect(body.payment.status).toBe('blocked');
    expect(body.payment.denialCode).toBe('PER_TX_LIMIT_EXCEEDED');
    const violation = body.decision.violations.find((v) => v.code === 'PER_TX_LIMIT_EXCEEDED');
    expect(violation?.details?.['usdCents']).toBe('6000');
  });

  it('fails closed when the price sources will not agree', async () => {
    const agentId = await createFundedAgent(h);
    await withUsdCeiling(agentId, '1000.00');
    h.market.setPrice(null);

    const response = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentId, { amount: '0.01' }),
    });
    const body = response.json() as {
      payment: { status: string };
      decision: { violations: Array<{ code: string }> };
    };
    expect(body.payment.status).toBe('blocked');
    expect(body.decision.violations.map((v) => v.code)).toContain('POLICY_VIOLATION');
  });

  it('never consults the market when no ceiling is configured', async () => {
    const agentId = await createFundedAgent(h);
    h.market.setPrice(null);

    const response = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentId),
    });
    expect((response.json() as { payment: { status: string } }).payment.status).toBe('settled');
  });

  it('records the price quotes it relied on in the audit trail', async () => {
    const agentId = await createFundedAgent(h);
    await withUsdCeiling(agentId, '100.00');
    h.market.setPrice(100);

    await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, ...key() },
      payload: paymentBody(agentId, { amount: '0.1' }),
    });

    const audit = await h.app.inject({ method: 'GET', url: '/v1/audit?limit=10', headers: h.auth });
    const event = (
      audit.json() as { events: Array<{ action: string; payload: Record<string, unknown> }> }
    ).events.find((e) => e.action === 'payment.approved' || e.action === 'payment.blocked');
    const quotes = event?.payload['priceQuotes'] as Array<{ source: string }> | undefined;
    expect(quotes?.map((q) => q.source)).toEqual(['token-api', 'gateway-subgraph']);
  });
});

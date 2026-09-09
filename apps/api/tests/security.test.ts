import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createFundedAgent, createHarness, paymentBody, type Harness } from './helpers.js';

let h: Harness;
let other: Harness;

beforeAll(async () => {
  h = await createHarness();
  other = await createHarness();
});
afterAll(async () => {
  await h.app.close();
  await other.app.close();
});

describe('authentication', () => {
  it('rejects a request with no credentials', async () => {
    const response = await h.app.inject({ method: 'GET', url: '/v1/agents' });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an unknown key', async () => {
    const response = await h.app.inject({
      method: 'GET',
      url: '/v1/agents',
      headers: { authorization: 'Bearer pocket_sk_not_a_real_key' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejects a malformed authorization scheme', async () => {
    for (const header of ['Basic abc', 'Bearer', 'Bearer ', h.apiKey]) {
      const response = await h.app.inject({
        method: 'GET',
        url: '/v1/agents',
        headers: { authorization: header },
      });
      expect(response.statusCode, header).toBe(401);
    }
  });

  it('serves health without credentials', async () => {
    const response = await h.app.inject({ method: 'GET', url: '/v1/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json().ok).toBe(true);
  });
});

describe('tenant isolation', () => {
  it("hides another organization's agent behind the same not-found as a missing one", async () => {
    const agentId = await createFundedAgent(h);

    const foreign = await other.app.inject({
      method: 'GET',
      url: `/v1/agents/${agentId}`,
      headers: other.auth,
    });
    const missing = await other.app.inject({
      method: 'GET',
      url: '/v1/agents/agent_does_not_exist',
      headers: other.auth,
    });

    expect(foreign.statusCode).toBe(404);
    expect(missing.statusCode).toBe(404);
    // Same code and message either way, so the API never distinguishes "belongs
    // to another tenant" from "does not exist". The details only echo the id the
    // caller already supplied, which leaks nothing.
    const shape = (r: typeof foreign) => {
      const { error } = r.json();
      return { code: error.code, message: error.message };
    };
    expect(shape(foreign)).toEqual(shape(missing));
  });

  it("refuses to pay from another organization's agent", async () => {
    const agentId = await createFundedAgent(h);
    const response = await other.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...other.auth, 'idempotency-key': randomUUID() },
      payload: paymentBody(agentId),
    });
    expect(response.statusCode).toBe(404);
  });

  it('scopes payment listings to the caller', async () => {
    const agentId = await createFundedAgent(h);
    await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, 'idempotency-key': randomUUID() },
      payload: paymentBody(agentId),
    });

    const mine = await h.app.inject({ method: 'GET', url: '/v1/payments', headers: h.auth });
    const theirs = await other.app.inject({
      method: 'GET',
      url: '/v1/payments',
      headers: other.auth,
    });
    expect(mine.json().payments.length).toBeGreaterThan(0);
    expect(theirs.json().payments).toHaveLength(0);
  });
});

describe('input validation', () => {
  it('rejects money with more precision than the asset supports', async () => {
    const agentId = await createFundedAgent(h);
    const response = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, 'idempotency-key': randomUUID() },
      payload: paymentBody(agentId, { amount: '0.1234567' }),
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_FAILED');
  });

  it('rejects a money amount sent as a JSON number', async () => {
    const agentId = await createFundedAgent(h);
    const response = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, 'idempotency-key': randomUUID() },
      payload: { ...paymentBody(agentId), amount: 0.08 },
    });
    expect(response.statusCode).toBe(400);
  });

  it('rejects a malformed recipient address', async () => {
    const agentId = await createFundedAgent(h);
    for (const recipient of ['not-an-address', '0x123', '', '0xZZZZ']) {
      const response = await h.app.inject({
        method: 'POST',
        url: '/v1/payments',
        headers: { ...h.auth, 'idempotency-key': randomUUID() },
        payload: paymentBody(agentId, { recipient }),
      });
      expect(response.statusCode, recipient).toBe(400);
    }
  });

  it('rejects a negative amount', async () => {
    const agentId = await createFundedAgent(h);
    const response = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, 'idempotency-key': randomUUID() },
      payload: paymentBody(agentId, { amount: '-1' }),
    });
    expect(response.statusCode).toBe(400);
  });
});

describe('credential handling', () => {
  it('returns the organization key exactly once, at creation', async () => {
    const created = await h.app.inject({
      method: 'POST',
      url: '/v1/orgs',
      payload: { name: 'One Time Key Org' },
    });
    const body = created.json();
    expect(body.apiKey).toMatch(/^pocket_sk_/);

    const me = await h.app.inject({
      method: 'GET',
      url: '/v1/orgs/me',
      headers: { authorization: `Bearer ${body.apiKey}` },
    });
    expect(me.body).not.toContain(body.apiKey);
  });

  it('never echoes a wallet secret or provider id in agent responses', async () => {
    const agentId = await createFundedAgent(h);
    const response = await h.app.inject({
      method: 'GET',
      url: `/v1/agents/${agentId}`,
      headers: h.auth,
    });
    for (const forbidden of ['providerWalletId', 'privateKey', 'seed', 'mnemonic', 'appSecret']) {
      expect(response.body, forbidden).not.toContain(forbidden);
    }
  });
});

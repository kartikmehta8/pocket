/**
 * Reading a policy back and writing it straight out again.
 *
 * An unset threshold comes back as null, so the document has to be accepted in
 * exactly the shape it was served rather than refused as a schema violation.
 *
 * Wallet reads answer null when there is no chain account yet, which is true of
 * a deterministic wallet and of a freshly provisioned real one alike. A faucet
 * asking for a `0.0.x` id needs the reader to understand that difference.
 *
 * The mirror node's own ceiling is fifteen seconds. A detail page that waits
 * that long for a value it only decorates itself with is broken whatever the
 * value turns out to be.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createFundedAgent, createHarness, SELLER, type Harness } from './helpers.js';

let h: Harness;

beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h.app.close();
});

/** The policy the dashboard sends when no approval threshold is switched on. */
function policyWith(overrides: Record<string, unknown> = {}) {
  return {
    allowedAssets: ['USDC'],
    allowedChains: ['hedera-testnet'],
    allowedCategories: ['research', 'data'],
    maxTransactionAmount: '2',
    trustedRecipients: [SELLER],
    unknownRecipientBehaviour: 'block',
    ...overrides,
  };
}

describe('policy round trip', () => {
  it('accepts a policy read back from the API without editing it', async () => {
    const agentId = await createFundedAgent(h);

    const read = await h.app.inject({
      method: 'GET',
      url: `/v1/agents/${agentId}`,
      headers: h.auth,
    });
    const policy = read.json().policy;
    expect(policy.approvalThreshold).toBeNull();

    const written = await h.app.inject({
      method: 'PUT',
      url: `/v1/agents/${agentId}/policy`,
      headers: h.auth,
      payload: policy,
    });
    expect(written.statusCode).toBe(200);
  });

  it('treats a null threshold as no threshold', async () => {
    const agentId = await createFundedAgent(h);

    const written = await h.app.inject({
      method: 'PUT',
      url: `/v1/agents/${agentId}/policy`,
      headers: h.auth,
      payload: policyWith({ approvalThreshold: null, maxUsdPerTransaction: null }),
    });
    expect(written.statusCode).toBe(200);

    const read = await h.app.inject({
      method: 'GET',
      url: `/v1/agents/${agentId}`,
      headers: h.auth,
    });
    expect(read.json().policy.approvalThreshold).toBeNull();
    expect(read.json().policy.maxUsdPerTransaction).toBeNull();
  });

  it('still keeps a threshold that was set', async () => {
    const agentId = await createFundedAgent(h);

    await h.app.inject({
      method: 'PUT',
      url: `/v1/agents/${agentId}/policy`,
      headers: h.auth,
      payload: policyWith({ approvalThreshold: '1' }),
    });

    const read = await h.app.inject({
      method: 'GET',
      url: `/v1/agents/${agentId}`,
      headers: h.auth,
    });
    expect(read.json().policy.approvalThreshold).toBe('1');
  });

  it('still refuses a threshold that is not an amount', async () => {
    const agentId = await createFundedAgent(h);

    const written = await h.app.inject({
      method: 'PUT',
      url: `/v1/agents/${agentId}/policy`,
      headers: h.auth,
      payload: policyWith({ approvalThreshold: 'soon' }),
    });
    expect(written.statusCode).toBe(400);
  });
});

describe('agent detail', () => {
  it('reports the Hedera account id as null until the account exists', async () => {
    const agentId = await createFundedAgent(h);

    const read = await h.app.inject({
      method: 'GET',
      url: `/v1/agents/${agentId}`,
      headers: h.auth,
    });

    expect(read.json()).toHaveProperty('accountId', null);
  });
});

describe('a chain that will not answer', () => {
  it('renders the agent rather than waiting on it', async () => {
    const agentId = await createFundedAgent(h);

    const started = Date.now();
    const read = await h.app.inject({
      method: 'GET',
      url: `/v1/agents/${agentId}`,
      headers: h.auth,
    });
    const elapsed = Date.now() - started;

    expect(read.statusCode).toBe(200);
    expect(elapsed).toBeLessThan(6_000);
  });
});

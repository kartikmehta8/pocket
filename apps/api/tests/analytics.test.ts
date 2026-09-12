/**
 * What the reporting surface says about what was spent.
 *
 * Every figure here is read back from the same ledger the policy engine wrote
 * to, so the totals cannot disagree with what was allowed. The series is dense
 * by construction: a chart that closed a quiet day by joining the two either
 * side of it would draw spending that never happened.
 *
 * Anomaly rules are coarse and explainable on purpose. A control that cannot
 * say why it fired gives an operator nothing to act on, so each one fires on a
 * simple multiple and states the multiple in its description.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { detectAnomalies, reconcile } from '../src/services/anomalies.js';
import { utcDayStart } from '../src/services/analytics.js';
import { createFundedAgent, createHarness, paymentBody, SELLER, type Harness } from './helpers.js';

let h: Harness;
let agentId: string;

beforeAll(async () => {
  h = await createHarness();
  agentId = await createFundedAgent(h);

  for (const amount of ['0.50', '0.25', '0.10']) {
    await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, 'idempotency-key': `spend-${amount}` },
      payload: paymentBody(agentId, { amount, category: 'data' }),
    });
  }
});

afterAll(async () => {
  await h.app.close();
});

describe('GET /v1/analytics/spend', () => {
  it('totals the window and breaks it down by category and recipient', async () => {
    const body = (
      await h.app.inject({ method: 'GET', url: '/v1/analytics/spend', headers: h.auth })
    ).json();

    expect(body.currency).toBe('USDC');
    expect(Number(body.periodSpend)).toBeGreaterThan(0);
    expect(body.byCategory.some((row: { category: string }) => row.category === 'data')).toBe(true);
    expect(
      body.byRecipient.some(
        (row: { address: string }) => row.address.toLowerCase() === SELLER.toLowerCase(),
      ),
    ).toBe(true);
  });

  it('scopes to one agent, and reconciles only when it can inspect a wallet', async () => {
    const body = (
      await h.app.inject({
        method: 'GET',
        url: `/v1/analytics/spend?agentId=${agentId}&days=30`,
        headers: h.auth,
      })
    ).json();

    expect(Number(body.periodSpend)).toBeGreaterThan(0);
    expect(body.source).toBeDefined();
  });

  it('reports nothing spent for an organization with no payments', async () => {
    const other = await createHarness();
    try {
      const body = (
        await other.app.inject({ method: 'GET', url: '/v1/analytics/spend', headers: other.auth })
      ).json();

      expect(body.periodSpend).toBe('0');
      expect(body.paymentCount).toBe(0);
      expect(body.increasePercent).toBeNull();
    } finally {
      await other.app.close();
    }
  });
});

describe('GET /v1/analytics/timeseries', () => {
  it('gives one point per day, with no gaps to draw through', async () => {
    const body = (
      await h.app.inject({ method: 'GET', url: '/v1/analytics/timeseries?days=7', headers: h.auth })
    ).json();

    expect(body.points).toHaveLength(7);
    for (let i = 1; i < body.points.length; i++) {
      const previous = Date.parse(`${body.points[i - 1].date}T00:00:00Z`);
      const current = Date.parse(`${body.points[i].date}T00:00:00Z`);
      expect(current - previous).toBe(24 * 60 * 60 * 1000);
    }
  });

  it('ends on today, so spend since midnight is not dropped', async () => {
    const body = (
      await h.app.inject({ method: 'GET', url: '/v1/analytics/timeseries?days=7', headers: h.auth })
    ).json();

    expect(body.points.at(-1).date).toBe(new Date().toISOString().slice(0, 10));
  });
});

describe('GET /v1/payments/stats', () => {
  it('counts every attempt by status, not a capped page of them', async () => {
    const body = (
      await h.app.inject({ method: 'GET', url: '/v1/payments/stats?days=7', headers: h.auth })
    ).json();

    const counted =
      Number(body.settled) +
      Number(body.blocked) +
      Number(body.failed) +
      Number(body.awaitingApproval);

    expect(Number(body.total)).toBeGreaterThanOrEqual(3);
    expect(counted).toBeLessThanOrEqual(Number(body.total));
  });

  it('scopes to one agent', async () => {
    const body = (
      await h.app.inject({
        method: 'GET',
        url: `/v1/payments/stats?agentId=${agentId}`,
        headers: h.auth,
      })
    ).json();

    expect(body.total).toBeGreaterThanOrEqual(3);
  });
});

describe('utcDayStart', () => {
  it('walks back whole UTC days from the midnight the instant falls in', () => {
    const noon = new Date('2026-09-12T12:34:56.789Z');

    expect(utcDayStart(noon).toISOString()).toBe('2026-09-12T00:00:00.000Z');
    expect(utcDayStart(noon, 6).toISOString()).toBe('2026-09-06T00:00:00.000Z');
  });

  it('crosses a month boundary correctly', () => {
    expect(utcDayStart(new Date('2026-03-02T01:00:00Z'), 3).toISOString()).toBe(
      '2026-02-27T00:00:00.000Z',
    );
  });
});

describe('detectAnomalies', () => {
  it('says nothing when there is nothing to say', () => {
    expect(
      detectAnomalies(100n, 100n, [{ address: '0xa', amount: 100n, count: 2 }], 'USDC'),
    ).toEqual([]);
  });

  it('flags spend that more than doubled, and states the multiple', () => {
    const [anomaly] = detectAnomalies(500n, 100n, [], 'USDC');

    expect(anomaly?.type).toBe('spend_spike');
    expect(anomaly?.description).toMatch(/5\.0/);
  });

  it('does not flag a spike against a window that spent nothing', () => {
    expect(detectAnomalies(500n, 0n, [], 'USDC')).toEqual([]);
  });

  it('flags a single recipient taking almost everything', () => {
    const anomalies = detectAnomalies(
      1_000n,
      1_000n,
      [
        { address: '0xdominant', amount: 950n, count: 9 },
        { address: '0xother', amount: 50n, count: 1 },
      ],
      'USDC',
    );

    expect(anomalies.some((a) => a.type === 'new_recipient_concentration')).toBe(true);
  });

  it('does not flag concentration when the spend is spread', () => {
    const anomalies = detectAnomalies(
      1_000n,
      1_000n,
      [
        { address: '0xa', amount: 500n, count: 5 },
        { address: '0xb', amount: 500n, count: 5 },
      ],
      'USDC',
    );

    expect(anomalies.some((a) => a.type === 'new_recipient_concentration')).toBe(false);
  });

  it('states every anomaly in words an operator can act on', () => {
    for (const anomaly of detectAnomalies(
      500n,
      100n,
      [{ address: '0xa', amount: 500n, count: 1 }],
      'USDC',
    )) {
      expect(anomaly.description.length).toBeGreaterThan(10);
      expect(['low', 'medium', 'high']).toContain(anomaly.severity);
    }
  });
});

describe('reconcile', () => {
  const ADDRESS = '0x000000000000000000000000000000000000beef';

  /** An analytics provider that answers with the given transfers. */
  function analytics(transfers: unknown[] | Error) {
    return {
      analytics: {
        getTransfers: () =>
          transfers instanceof Error ? Promise.reject(transfers) : Promise.resolve(transfers),
      },
    } as never;
  }

  /** One outbound transfer of `amount` base units. */
  function outbound(amount: bigint) {
    return { from: ADDRESS.toLowerCase(), to: '0xseller', amount, asset: 'USDC' };
  }

  it('says nothing when the chain agrees with the ledger', async () => {
    const result = await reconcile(
      analytics([outbound(500_000n)]),
      ADDRESS,
      new Date(0),
      new Date(),
      500_000n,
      'USDC',
    );

    expect(result).toBeNull();
  });

  it('flags more on chain than Pocket authorized as the serious direction', async () => {
    const result = await reconcile(
      analytics([outbound(900_000n)]),
      ADDRESS,
      new Date(0),
      new Date(),
      500_000n,
      'USDC',
    );

    expect(result?.type).toBe('ledger_chain_mismatch');
    expect(result?.severity).toBe('high');
    expect(result?.description).toContain('0.4');
  });

  it('flags less on chain as the lesser one, which is a settlement that has not landed', async () => {
    const result = await reconcile(
      analytics([outbound(100_000n)]),
      ADDRESS,
      new Date(0),
      new Date(),
      500_000n,
      'USDC',
    );

    expect(result?.severity).toBe('low');
  });

  it('ignores inbound transfers and other assets', async () => {
    const result = await reconcile(
      analytics([
        { from: '0xelsewhere', to: ADDRESS.toLowerCase(), amount: 999n, asset: 'USDC' },
        { from: ADDRESS.toLowerCase(), to: '0xseller', amount: 999n, asset: 'HBAR' },
        outbound(500_000n),
      ]),
      ADDRESS,
      new Date(0),
      new Date(),
      500_000n,
      'USDC',
    );

    expect(result).toBeNull();
  });

  it('reports nothing rather than a false alarm when the index is unreachable', async () => {
    const result = await reconcile(
      analytics(new Error('subgraph is down')),
      ADDRESS,
      new Date(0),
      new Date(),
      500_000n,
      'USDC',
    );

    expect(result).toBeNull();
  });
});

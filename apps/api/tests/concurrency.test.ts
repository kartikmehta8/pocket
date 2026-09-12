/**
 * What happens when an agent spends in parallel.
 *
 * An autonomous agent does not wait its turn. It fires several purchases at
 * once, and every one of them reads the budget, decides, and writes. Without
 * serialisation each would read the same remaining balance and all of them
 * would pass, which is how a spending limit quietly becomes a suggestion.
 *
 * `lockAgent` takes a row lock inside the authorisation transaction so those
 * reads queue behind each other. These tests exist to prove that holds under
 * contention rather than only in the reading of it, so they run against real
 * Postgres: an in-memory fake cannot fail the way a database can.
 *
 * The numbers are chosen, not arbitrary. Ten payments at 2.00 against a 20.00
 * daily limit all fit, and the point is that none is lost or double-counted;
 * fifteen at 2.00 means ten can be afforded and five must be refused. The
 * invariant is never a cent over the limit, and one payment means one transfer
 * however many callers asked. The pool holds ten connections, and each
 * authorisation runs in a transaction that owns one for its whole life — so a
 * read taken off the pool from inside would wait for a connection only another
 * transaction can release. Forty at once is four times the pool, which turns
 * that mistake from a rare stall into a certainty.
 */

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

/** Fires `count` payments at once and returns every response body. */
async function stampede(agentId: string, count: number, amount: string) {
  const attempts = Array.from({ length: count }, () =>
    h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, 'idempotency-key': randomUUID() },
      payload: paymentBody(agentId, { amount }),
    }),
  );
  const responses = await Promise.all(attempts);
  return responses.map((r) => r.json());
}

/** Sums the amounts of every attempt that reserved or spent money. */
function committed(bodies: { payment: { status: string; amount: string } }[]): number {
  return bodies
    .filter((b) => b.payment.status !== 'blocked')
    .reduce((total, b) => total + Number(b.payment.amount), 0);
}

describe('a daily limit under contention', () => {
  it('lets exactly the affordable number through when ten fire at once', async () => {
    const agentId = await createFundedAgent(h);
    const bodies = await stampede(agentId, 10, '2');

    const settled = bodies.filter((b) => b.payment.status === 'settled');
    expect(settled).toHaveLength(10);
    expect(committed(bodies)).toBeCloseTo(20, 6);
  });

  it('refuses the overflow rather than letting the limit be exceeded', async () => {
    const agentId = await createFundedAgent(h);
    const bodies = await stampede(agentId, 15, '2');

    const settled = bodies.filter((b) => b.payment.status === 'settled');
    const blocked = bodies.filter((b) => b.payment.status === 'blocked');

    expect(settled.length + blocked.length).toBe(15);
    expect(settled).toHaveLength(10);
    expect(blocked).toHaveLength(5);
    expect(committed(bodies)).toBeLessThanOrEqual(20);
  });

  it('gives every refusal the reason, so none of them look like a crash', async () => {
    const agentId = await createFundedAgent(h);
    const bodies = await stampede(agentId, 15, '2');

    for (const body of bodies.filter((b) => b.payment.status === 'blocked')) {
      expect(body.payment.denialCode).toBe('DAILY_BUDGET_EXCEEDED');
      expect(body.decision.violations.length).toBeGreaterThan(0);
    }
  });

  it('moves money exactly once per settled payment', async () => {
    const agentId = await createFundedAgent(h);
    const before = h.wallet.sent.length;
    const bodies = await stampede(agentId, 15, '2');

    const settled = bodies.filter((b) => b.payment.status === 'settled');
    expect(h.wallet.sent.length - before).toBe(settled.length);
  });
});

describe('one idempotency key under contention', () => {
  it('pays once when the same key arrives several times at once', async () => {
    const agentId = await createFundedAgent(h);
    const before = h.wallet.sent.length;
    const shared = randomUUID();

    const responses = await Promise.all(
      Array.from({ length: 8 }, () =>
        h.app.inject({
          method: 'POST',
          url: '/v1/payments',
          headers: { ...h.auth, 'idempotency-key': shared },
          payload: paymentBody(agentId),
        }),
      ),
    );

    const ids = new Set(
      responses
        .map((r) => r.json())
        .filter((b) => b.payment !== undefined)
        .map((b) => b.payment.id),
    );
    expect(ids.size).toBe(1);
    expect(h.wallet.sent.length - before).toBe(1);
  });
});

describe('more callers at once than the connection pool has room for', () => {
  it('does not deadlock when concurrency exceeds the pool', async () => {
    const agentId = await createFundedAgent(h);
    const bodies = await stampede(agentId, 40, '1');

    expect(bodies).toHaveLength(40);
    for (const body of bodies) {
      expect(['settled', 'blocked']).toContain(body.payment.status);
    }
  });

  it('still holds the limit exactly, with forty racing for twenty', async () => {
    const agentId = await createFundedAgent(h);
    const bodies = await stampede(agentId, 40, '1');

    const settled = bodies.filter((b) => b.payment.status === 'settled');
    expect(settled).toHaveLength(20);
    expect(committed(bodies)).toBeCloseTo(20, 6);
  });
});

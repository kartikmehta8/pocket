/**
 * The record, and the filters that narrow it.
 *
 * Each case leaves a mixed trail behind — an agent with a budget and a policy,
 * and one settled payment — so there is more than one action family to filter
 * on.
 *
 * `task_budget` carries an underscore, which is a LIKE wildcard. Unescaped it
 * would also match `taskXbudget.*`; escaped it matches only the family it names.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createFundedAgent, createHarness, paymentBody, type Harness } from './helpers.js';

let h: Harness;

/** Events as the route returns them, typed for what these tests read. */
interface Event {
  id: string;
  action: string;
  actorType: string;
}

beforeAll(async () => {
  h = await createHarness();
  const agentId = await createFundedAgent(h);
  const response = await h.app.inject({
    method: 'POST',
    url: '/v1/payments',
    headers: { ...h.auth, 'idempotency-key': randomUUID() },
    payload: paymentBody(agentId),
  });
  expect(response.statusCode).toBe(200);
});

afterAll(async () => {
  await h.app.close();
});

async function read(query: string): Promise<{ events: Event[]; nextCursor: string | null }> {
  const response = await h.app.inject({ method: 'GET', url: `/v1/audit${query}`, headers: h.auth });
  expect(response.statusCode).toBe(200);
  return response.json();
}

describe('GET /v1/audit', () => {
  it('narrows to an action family, matched as a prefix', async () => {
    const all = await read('');
    const payments = await read('?action=payment');
    expect(payments.events.length).toBeGreaterThan(0);
    expect(payments.events.length).toBeLessThan(all.events.length);
    for (const event of payments.events) expect(event.action).toMatch(/^payment\./);
  });

  it('does not let a LIKE wildcard in the family widen the match', async () => {
    const page = await read('?action=task_budget');
    for (const event of page.events) expect(event.action).toMatch(/^task_budget\./);
  });

  it('narrows to one actor type', async () => {
    const all = await read('');
    const actorType = all.events[0]?.actorType;
    expect(actorType).toBeDefined();
    const page = await read(`?actorType=${actorType}`);
    expect(page.events.length).toBeGreaterThan(0);
    for (const event of page.events) expect(event.actorType).toBe(actorType);
  });

  it('pages through a filtered trail without repeating an event', async () => {
    const first = await read('?limit=1');
    expect(first.events).toHaveLength(1);
    expect(first.nextCursor).not.toBeNull();
    const second = await read(`?limit=1&cursor=${first.nextCursor}`);
    expect(second.events).toHaveLength(1);
    expect(second.events[0]?.id).not.toBe(first.events[0]?.id);
  });

  it('refuses a malformed action family', async () => {
    const response = await h.app.inject({
      method: 'GET',
      url: '/v1/audit?action=payment;drop',
      headers: h.auth,
    });
    expect(response.statusCode).toBe(400);
  });
});

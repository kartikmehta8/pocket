/**
 * Paging the payment list.
 *
 * The fixtures are made back to back so at least two are likely to share a
 * millisecond, which is what gives the keyset something to disambiguate.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createFundedAgent, createHarness, paymentBody, type Harness } from './helpers.js';

let h: Harness;
let agentId: string;

beforeAll(async () => {
  h = await createHarness();
  agentId = await createFundedAgent(h);
  for (let i = 0; i < 3; i += 1) {
    const response = await h.app.inject({
      method: 'POST',
      url: '/v1/payments',
      headers: { ...h.auth, 'idempotency-key': randomUUID() },
      payload: paymentBody(agentId, { amount: '0.01' }),
    });
    expect(response.statusCode).toBe(200);
  }
});

afterAll(async () => {
  await h.app.close();
});

async function read(
  query: string,
): Promise<{ payments: Array<{ id: string; createdAt: string }>; nextCursor: string | null }> {
  const response = await h.app.inject({
    method: 'GET',
    url: `/v1/payments?agentId=${agentId}${query}`,
    headers: h.auth,
  });
  expect(response.statusCode).toBe(200);
  return response.json();
}

describe('GET /v1/payments paging', () => {
  it('walks every payment exactly once, newest first, one per page', async () => {
    const all = await read('');
    expect(all.payments).toHaveLength(3);
    expect(all.nextCursor).toBeNull();

    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page = await read(
        `&limit=1${cursor === null ? '' : `&cursor=${encodeURIComponent(cursor)}`}`,
      );
      expect(page.payments).toHaveLength(1);
      seen.push(...page.payments.map((payment) => payment.id));
      cursor = page.nextCursor;
    } while (cursor !== null);

    expect(seen).toEqual(all.payments.map((payment) => payment.id));
  });

  it('reads an unrecognisable cursor as the first page rather than failing', async () => {
    const page = await read('&cursor=not-a-cursor');
    expect(page.payments).toHaveLength(3);
  });
});

/**
 * The client every tool call goes through.
 *
 * Two things here decide what an agent is told. The credential is attached per
 * request from the key that request carried, so one caller's key can never
 * reach another caller's organization. And a non-2xx answer becomes a
 * `PocketApiError` carrying the API's own stable code — an agent that is told
 * `DAILY_BUDGET_EXCEEDED` can pick something cheaper, while one that gets
 * "request failed" retries the same thing until the operator loses patience.
 */

import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PocketApiError, PocketClient } from '../src/client.js';

/** What the fake API was asked for, so a test can assert on the request. */
interface Seen {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

let server: Server;
let base: string;
let seen: Seen;
let reply: { status: number; body: string } = { status: 200, body: '{"ok":true}' };

beforeAll(async () => {
  server = createServer((request, response) => {
    let body = '';
    request.on('data', (chunk) => (body += String(chunk)));
    request.on('end', () => {
      seen = {
        method: request.method ?? '',
        url: request.url ?? '',
        headers: request.headers,
        body,
      };
      response.writeHead(reply.status, { 'content-type': 'application/json' });
      response.end(reply.body);
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve();
    });
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('No port.');
  base = `http://127.0.0.1:${String(address.port)}`;
});

afterAll(() => {
  server.close();
});

/** A client pointed at the fake API, with a trailing slash to be stripped. */
function client(apiKey = 'pocket_sk_test'): PocketClient {
  reply = { status: 200, body: '{"ok":true}' };
  return new PocketClient({ baseUrl: `${base}/`, apiKey });
}

describe('authentication', () => {
  it('presents the key the request carried, and nothing else', async () => {
    await client('pocket_sk_alice').listAgents();
    expect(seen.headers['authorization']).toBe('Bearer pocket_sk_alice');
  });

  it('keeps two callers apart', async () => {
    await client('pocket_sk_alice').listAgents();
    expect(seen.headers['authorization']).toBe('Bearer pocket_sk_alice');
    await client('pocket_sk_bob').listAgents();
    expect(seen.headers['authorization']).toBe('Bearer pocket_sk_bob');
  });
});

describe('requests', () => {
  it('strips a trailing slash rather than sending a double one', async () => {
    await client().listAgents();
    expect(seen.url).toBe('/v1/agents');
  });

  it('escapes an identifier into the path', async () => {
    await client().getAgent('agent with/slash');
    expect(seen.url).toBe('/v1/agents/agent%20with%2Fslash');
  });

  it('sends no content type when there is no body', async () => {
    await client().listAgents();
    expect(seen.headers['content-type']).toBeUndefined();
  });

  it('sends JSON when there is one', async () => {
    await client().preview({ amount: '0.08' });
    expect(seen.headers['content-type']).toBe('application/json');
    expect(JSON.parse(seen.body)).toEqual({ amount: '0.08' });
  });

  it('passes an idempotency key through when one is given', async () => {
    await client().pay({ amount: '1' }, 'key-1');
    expect(seen.headers['idempotency-key']).toBe('key-1');
  });

  it('omits the idempotency header when there is none', async () => {
    await client().purchase({ url: 'https://seller.example.com' });
    expect(seen.headers['idempotency-key']).toBeUndefined();
  });

  it('appends a query string verbatim', async () => {
    await client().listPayments('?limit=5&status=blocked');
    expect(seen.url).toBe('/v1/payments?limit=5&status=blocked');
    await client().spendSummary('?days=7');
    expect(seen.url).toBe('/v1/analytics/spend?days=7');
    await client().audit('?limit=50');
    expect(seen.url).toBe('/v1/audit?limit=50');
  });

  it('addresses the task budget under its agent', async () => {
    await client().createTaskBudget('agent_1', { limit: '0.5' });
    expect(seen.url).toBe('/v1/agents/agent_1/task-budgets');
    expect(seen.method).toBe('POST');
  });
});

describe('failures', () => {
  it("carries the API's own code, so an agent can act on the refusal", async () => {
    const call = client().purchase({});
    reply = {
      status: 200,
      body: JSON.stringify({
        error: { code: 'DAILY_BUDGET_EXCEEDED', message: 'No room left today.', details: { l: 1 } },
      }),
    };
    await call;

    const c = new PocketClient({ baseUrl: base, apiKey: 'k' });
    reply = {
      status: 402,
      body: JSON.stringify({
        error: { code: 'DAILY_BUDGET_EXCEEDED', message: 'No room left today.', details: { l: 1 } },
      }),
    };
    await expect(c.purchase({})).rejects.toBeInstanceOf(PocketApiError);
    await expect(c.purchase({})).rejects.toMatchObject({
      status: 402,
      code: 'DAILY_BUDGET_EXCEEDED',
      message: 'No room left today.',
      details: { l: 1 },
    });
  });

  it('falls back to a readable message when the body is not an envelope', async () => {
    const c = new PocketClient({ baseUrl: base, apiKey: 'k' });
    reply = { status: 500, body: '{}' };
    await expect(c.listAgents()).rejects.toMatchObject({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Pocket API returned 500.',
    });
  });

  it('treats an empty body as an empty object rather than a parse error', async () => {
    const c = new PocketClient({ baseUrl: base, apiKey: 'k' });
    reply = { status: 200, body: '' };
    await expect(c.listAgents()).resolves.toEqual({});
  });

  it('gives up rather than hanging when the API does not answer', async () => {
    const slow = createServer(() => {
      /* never responds */
    });
    await new Promise<void>((resolve) => {
      slow.listen(0, '127.0.0.1', () => {
        resolve();
      });
    });
    const address = slow.address();
    if (address === null || typeof address === 'string') throw new Error('No port.');
    const c = new PocketClient({
      baseUrl: `http://127.0.0.1:${String(address.port)}`,
      apiKey: 'k',
      timeoutMs: 50,
    });
    await expect(c.listAgents()).rejects.toThrow();
    slow.close();
  });
});

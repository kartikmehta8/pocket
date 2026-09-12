/**
 * What a buyer is told when a seller turns a signed payment down.
 *
 * An x402 seller answers a rejected payment exactly as it answers an unpaid
 * request: 402, an empty JSON body, and the challenge in a header. Reading the
 * body alone tells the buyer `{}`, which is how a real purchase came back with
 * no reason at all.
 */

import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { payForResource } from '../src/services/x402-http.js';
import type { X402PaymentPayload } from '../src/services/x402-types.js';

/** A payload shaped like a signed one; the fake seller never inspects it. */
const PAYLOAD = {
  x402Version: 2,
  scheme: 'exact',
  network: 'hedera-testnet',
  payload: {},
} as unknown as X402PaymentPayload;

/** Encodes a challenge the way a seller does. */
function challenge(error: string): string {
  return Buffer.from(JSON.stringify({ x402Version: 2, error, accepts: [] })).toString('base64');
}

/** A seller that refuses every payment the way the real one does. */
function seller(handler: (url: string, respond: RespondFn) => void): Promise<Server> {
  const server = createServer((request, response) => {
    handler(request.url ?? '/', (status, headers, body) => {
      response.writeHead(status, { 'content-type': 'application/json', ...headers });
      response.end(body);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

/** How a fake seller answers: status, headers, body. */
type RespondFn = (status: number, headers: Record<string, string>, body: string) => void;

describe('a seller that refuses a signed payment', () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    server = await seller((url, respond) => {
      if (url === '/stated') {
        respond(402, { 'payment-required': challenge('No matching payment requirements') }, '{}');
      } else if (url === '/silent') {
        respond(402, {}, '{}');
      } else if (url === '/gateway') {
        respond(502, {}, 'upstream is down');
      } else {
        respond(200, {}, JSON.stringify({ ok: true }));
      }
    });
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('No port.');
    base = `http://127.0.0.1:${address.port}`;
  });

  afterAll(() => {
    server.close();
  });

  it('reports the reason the seller stated in its header', async () => {
    const result = await payForResource(new URL(`${base}/stated`), PAYLOAD);
    expect(result).toEqual({
      kind: 'rejected',
      status: 402,
      detail: 'No matching payment requirements',
    });
  });

  it('says nothing rather than quoting an empty body', async () => {
    const result = await payForResource(new URL(`${base}/silent`), PAYLOAD);
    expect(result).toEqual({ kind: 'rejected', status: 402, detail: '' });
  });

  it('falls back to the body for a refusal that is not x402 at all', async () => {
    const result = await payForResource(new URL(`${base}/gateway`), PAYLOAD);
    expect(result).toEqual({ kind: 'rejected', status: 502, detail: 'upstream is down' });
  });

  it('serves the resource when the payment is accepted', async () => {
    const result = await payForResource(new URL(`${base}/ok`), PAYLOAD);
    expect(result).toEqual({ kind: 'served', body: { ok: true }, settlement: null });
  });
});

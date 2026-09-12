/**
 * Buying a paid resource end to end.
 *
 * One request does the whole exchange: fetch the resource, read the seller's
 * terms, price it, decide it, sign it, present it and record what came back.
 * The caller never holds a signed payload, which is what stops an agent routing
 * around the policy engine even when it could reach the seller itself.
 *
 * The seller is a real HTTP server on loopback rather than a stubbed fetch, so
 * the header encoding is exercised rather than assumed. The signer is stubbed,
 * because what a Hedera transaction serialises to is not what these cases are
 * about and the deterministic wallet holds no key to sign with. The harness
 * declares that wallet live, which is all these routes ask before they run.
 *
 * A refusal is a normal outcome, not an error. An agent that is told it was
 * blocked, and how much room was left, can pick something cheaper.
 */

import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const createPrivyHederaSigner = vi.hoisted(() => vi.fn());
const resolveHederaAccount = vi.hoisted(() => vi.fn());

vi.mock('@pocket/adapters', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@pocket/adapters')>()),
  createPrivyHederaSigner,
  resolveHederaAccount,
}));

const { createFundedAgent, createHarness, SELLER } = await import('./helpers.js');

let h: Awaited<ReturnType<typeof createHarness>>;
let agentId: string;
let seller: Server;
let sellerUrl: string;

/** What the seller does next: its price, and whether it serves once paid. */
const script = { price: '80000', serve: true, repriceAfterQuote: false };

/** Encodes an x402 challenge the way a seller does. */
function challenge(amount: string): string {
  return Buffer.from(
    JSON.stringify({
      x402Version: 2,
      accepts: [
        {
          scheme: 'exact',
          network: 'hedera:testnet',
          amount,
          asset: '0.0.429274',
          payTo: '0.0.5678',
          maxTimeoutSeconds: 120,
          extra: { feePayer: '0.0.800' },
        },
      ],
    }),
  ).toString('base64');
}

beforeAll(async () => {
  vi.stubEnv('HEDERA_USDC_ADDRESS', '0x0000000000000000000000000000000000068cda');
  vi.stubEnv('ALLOW_PRIVATE_RESOURCE_HOSTS', 'true');

  resolveHederaAccount.mockResolvedValue({
    accountId: '0.0.10425079',
    evmAddress: SELLER,
    publicKey: null,
  });
  createPrivyHederaSigner.mockResolvedValue({
    accountId: '0.0.10425079',
    createPartiallySignedTransferTransaction: () => Promise.resolve('c2lnbmVk'),
  });

  seller = createServer((request, response) => {
    const paid = request.headers['payment-signature'] !== undefined;
    if (!paid) {
      response.writeHead(402, {
        'content-type': 'application/json',
        'payment-required': challenge(script.price),
      });
      response.end('{}');
      return;
    }
    if (!script.serve) {
      response.writeHead(402, {
        'content-type': 'application/json',
        'payment-required': Buffer.from(
          JSON.stringify({
            x402Version: 2,
            error: 'No matching payment requirements',
            accepts: [],
          }),
        ).toString('base64'),
      });
      response.end('{}');
      return;
    }
    response.writeHead(200, {
      'content-type': 'application/json',
      'payment-response': Buffer.from(
        JSON.stringify({ success: true, transaction: '0.0.1@2.3', network: 'hedera:testnet' }),
      ).toString('base64'),
    });
    response.end(JSON.stringify({ quotes: [{ symbol: 'ETH', priceUsd: 2484 }] }));
  });
  await new Promise<void>((resolve) => {
    seller.listen(0, '127.0.0.1', () => {
      resolve();
    });
  });
  const address = seller.address();
  if (address === null || typeof address === 'string') throw new Error('No port.');
  sellerUrl = `http://127.0.0.1:${String(address.port)}/v1/market/prices`;

  h = await createHarness({ walletLive: true });
  agentId = await createFundedAgent(h, {
    trustedRecipients: [],
    unknownRecipientBehaviour: 'allow',
  });
});

afterAll(async () => {
  seller.close();
  await h.app.close();
  vi.unstubAllEnvs();
});

/** Asks the API to buy the fake seller's resource. */
function purchase(body: Record<string, unknown> = {}) {
  return h.app.inject({
    method: 'POST',
    url: '/v1/payments/x402/purchase',
    headers: h.auth,
    payload: { agentId, url: sellerUrl, reason: 'Prices for the portfolio view', ...body },
  });
}

describe('a purchase that goes through', () => {
  it('pays, serves the content, and reports what it cost', async () => {
    script.price = '80000';
    script.serve = true;
    const body = (await purchase()).json();

    expect(body.status).toBe('paid');
    expect(body.result).toEqual({ quotes: [{ symbol: 'ETH', priceUsd: 2484 }] });
    expect(body.payment.amount).toBe('0.08');
    expect(body.payment.asset).toBe('USDC');
  });

  it('records the attempt against the agent', async () => {
    const payments = (
      await h.app.inject({
        method: 'GET',
        url: `/v1/payments?agentId=${agentId}`,
        headers: h.auth,
      })
    ).json();

    expect(payments.payments.length).toBeGreaterThan(0);
    expect(payments.payments[0].resource).toContain('/v1/market/prices');
  });

  it('charges once for a repeat of the same purchase', async () => {
    script.price = '90000';
    script.serve = true;
    const first = (await purchase()).json();
    const second = (await purchase()).json();

    expect(first.status).toBe('paid');
    expect(second.status).toBe('replayed');
    expect(second.payment.id).toBe(first.payment.id);
  });

  it('treats a reprice as a different purchase rather than replaying the cheap one', async () => {
    script.price = '100000';
    const first = (await purchase()).json();
    script.price = '110000';
    const second = (await purchase()).json();

    expect(second.payment.id).not.toBe(first.payment.id);
  });
});

describe('a purchase policy refuses', () => {
  it('comes back blocked, with nothing signed and nothing charged', async () => {
    script.price = '3000000';
    script.serve = true;
    const body = (await purchase()).json();

    expect(body.status).toBe('blocked');
    expect(body.result).toBeUndefined();
    expect(body.decision.violations.length).toBeGreaterThan(0);
  });
});

describe('a seller that refuses the payment', () => {
  it('says what the seller said, rather than quoting an empty body', async () => {
    script.price = '70000';
    script.serve = false;
    const body = (await purchase()).json();

    expect(body.status).toBe('failed');
    expect(String(body.message)).toMatch(/No matching payment requirements/);
  });
});

describe('an outbound address the deployment forbids', () => {
  it('is refused before anything is fetched', async () => {
    vi.stubEnv('ALLOW_PRIVATE_RESOURCE_HOSTS', 'false');
    const isolated = await createHarness();
    try {
      const agent = await createFundedAgent(isolated);
      const response = await isolated.app.inject({
        method: 'POST',
        url: '/v1/payments/x402/purchase',
        headers: isolated.auth,
        payload: {
          agentId: agent,
          url: 'http://169.254.169.254/latest/meta-data',
          reason: 'probe',
        },
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    } finally {
      await isolated.app.close();
      vi.stubEnv('ALLOW_PRIVATE_RESOURCE_HOSTS', 'true');
    }
  });
});

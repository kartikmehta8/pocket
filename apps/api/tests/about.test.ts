/**
 * What the service says about itself, without a credential.
 *
 * `GET /` is the front door. It names every endpoint, which is collected from
 * Fastify rather than written by hand, so the index cannot fall behind the API
 * it describes. Nothing it carries belongs to an organization, which is why it
 * is reachable without a key — and that is worth a test, because a route that
 * quietly started requiring one would break every monitor pointed at it.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createHarness, type Harness } from './helpers.js';

let h: Harness;

beforeAll(async () => {
  h = await createHarness();
});

afterAll(async () => {
  await h.app.close();
});

describe('GET /', () => {
  it('answers without a credential', async () => {
    const response = await h.app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(200);
  });

  it('is never cached, because uptime changes under the reader', async () => {
    const response = await h.app.inject({ method: 'GET', url: '/' });

    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('describes what it is and what it promises', async () => {
    const body = (await h.app.inject({ method: 'GET', url: '/' })).json();

    expect(body.service).toBe('pocket-api');
    expect(body.chain).toBe(h.config.CHAIN);
    expect(Array.isArray(body.guarantees)).toBe(true);
    expect(body.guarantees.length).toBeGreaterThan(0);
  });

  it('lists its own surface, collected rather than written out', async () => {
    const body = (await h.app.inject({ method: 'GET', url: '/' })).json();

    expect(body.endpoints).toContain('GET /v1/agents');
    expect(body.endpoints).toContain('POST /v1/payments/x402/purchase');
    expect(body.endpoints).toContain('GET /');
  });

  it('lists no HEAD route, which would double the index and say nothing', async () => {
    const body = (await h.app.inject({ method: 'GET', url: '/' })).json();

    expect(body.endpoints.filter((route: string) => route.startsWith('HEAD'))).toHaveLength(0);
  });

  it('names which vendor is answering for each adapter', async () => {
    const body = (await h.app.inject({ method: 'GET', url: '/' })).json();

    expect(Object.keys(body.adapters)).toEqual([
      'wallet',
      'chain',
      'analytics',
      'market',
      'identity',
    ]);
  });

  it('says which build is running and how long it has been up', async () => {
    const body = (await h.app.inject({ method: 'GET', url: '/' })).json();

    expect(body.release.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(typeof body.release.startedAt).toBe('string');
    expect(body.release.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('carries no organization data, which is why it needs no key', async () => {
    const raw = (await h.app.inject({ method: 'GET', url: '/' })).body;

    expect(raw).not.toContain(h.orgId);
    expect(raw).not.toContain(h.apiKey);
  });

  it('names the public routes that a caller can reach without one', async () => {
    const body = (await h.app.inject({ method: 'GET', url: '/' })).json();

    expect(body.auth.public).toContain('GET /v1/health');
    expect(body.auth.public).toContain('POST /v1/orgs');
  });
});

describe('GET /v1/health', () => {
  it('answers without a credential and reports the adapter wiring', async () => {
    const response = await h.app.inject({ method: 'GET', url: '/v1/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: true, chain: h.config.CHAIN });
  });
});

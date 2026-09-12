/**
 * Sign-in, tenancy provisioning and credential management.
 *
 * The offline identity verifier treats the presented token as the subject, so
 * a test can impersonate distinct people by presenting distinct strings. That
 * is enough to exercise the parts that matter: which tenant a session lands
 * in, and what a machine credential is refused.
 *
 * Signing in must not hand back a secret, and must not leave one behind for
 * the account to be reached with either. A fresh organization holds no keys at
 * all, so telling it to replace the last one before revoking would name a key
 * it has never had. The tenancy cases give the stranger two live keys of their
 * own, so the refusal proves tenancy scoping rather than the last-key guard.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHarness, type Harness } from './helpers.js';

let h: Harness;

/** Presents `subject` as an identity token. */
function session(subject: string): { authorization: string } {
  return { authorization: `Bearer ${subject}` };
}

/** Signs in and returns the status and body. */
async function signIn(subject: string, body: Record<string, unknown> = {}) {
  const response = await h.app.inject({
    method: 'POST',
    url: '/v1/auth/session',
    headers: session(subject),
    payload: body,
  });
  return { status: response.statusCode, body: response.json<Record<string, unknown>>() };
}

beforeAll(async () => {
  h = await createHarness();
});

afterAll(async () => {
  await h.app.close();
});

describe('session bootstrap', () => {
  it('creates an organization on first sign-in', async () => {
    const { status, body } = await signIn(`alice-${Date.now()}`, { orgName: 'Northwind' });

    expect(status).toBe(201);
    expect(body['provisioned']).toBe(true);
    expect((body['org'] as { name: string }).name).toBe('Northwind');
  });

  it('mints no credential nobody asked for', async () => {
    const subject = `dana-${Date.now()}`;
    const { body } = await signIn(subject);

    expect(body).not.toHaveProperty('apiKey');

    const keys = await h.app.inject({
      method: 'GET',
      url: '/v1/api-keys',
      headers: session(subject),
    });
    expect(keys.json<{ keys: unknown[] }>().keys).toHaveLength(0);
  });

  it('returns the same organization on a second sign-in', async () => {
    const subject = `bob-${Date.now()}`;
    const first = await signIn(subject);
    const second = await signIn(subject);

    expect(second.status).toBe(200);
    expect(second.body['provisioned']).toBe(false);
    expect((second.body['org'] as { id: string }).id).toBe(
      (first.body['org'] as { id: string }).id,
    );
  });

  it('refuses a request with no bearer token', async () => {
    const response = await h.app.inject({ method: 'POST', url: '/v1/auth/session', payload: {} });
    expect(response.statusCode).toBe(401);
  });
});

describe('session-scoped requests', () => {
  it('resolves an identity token to its own organization', async () => {
    const subject = `carol-${Date.now()}`;
    const { body } = await signIn(subject, { orgName: 'Carol Labs' });

    const response = await h.app.inject({
      method: 'GET',
      url: '/v1/orgs/me',
      headers: session(subject),
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json<{ org: { id: string }; principal: string }>();
    expect(payload.org.id).toBe((body['org'] as { id: string }).id);
    expect(payload.principal).toBe('session');
  });

  it('refuses an identity token that has never signed in', async () => {
    const response = await h.app.inject({
      method: 'GET',
      url: '/v1/orgs/me',
      headers: session(`ghost-${Date.now()}`),
    });
    expect(response.statusCode).toBe(401);
  });

  it('reports an API key caller as a machine principal', async () => {
    const response = await h.app.inject({ method: 'GET', url: '/v1/orgs/me', headers: h.auth });
    expect(response.json<{ principal: string }>().principal).toBe('api-key');
  });
});

/** Mints a key for `subject` and returns its id and plaintext. */
async function mintKey(subject: string, label: string) {
  const created = await h.app.inject({
    method: 'POST',
    url: '/v1/api-keys',
    headers: session(subject),
    payload: { label },
  });
  expect(created.statusCode).toBe(201);
  return created.json<{ apiKey: string; key: { id: string; label: string } }>();
}

describe('api key management', () => {
  it('refuses key listing to an API key caller', async () => {
    const response = await h.app.inject({ method: 'GET', url: '/v1/api-keys', headers: h.auth });
    expect(response.statusCode).toBe(403);
  });

  it('issues a key that then authenticates as the same organization', async () => {
    const subject = `dave-${Date.now()}`;
    const signed = await signIn(subject);
    const orgId = (signed.body['org'] as { id: string }).id;

    const created = await h.app.inject({
      method: 'POST',
      url: '/v1/api-keys',
      headers: session(subject),
      payload: { label: 'Hermes runtime' },
    });
    expect(created.statusCode).toBe(201);
    const minted = created.json<{ apiKey: string; key: { id: string; label: string } }>();
    expect(minted.key.label).toBe('Hermes runtime');

    const used = await h.app.inject({
      method: 'GET',
      url: '/v1/orgs/me',
      headers: { authorization: `Bearer ${minted.apiKey}` },
    });
    expect(used.json<{ org: { id: string } }>().org.id).toBe(orgId);
  });

  it('refuses to revoke the last live key', async () => {
    const subject = `erin-${Date.now()}`;
    await signIn(subject);
    const only = await mintKey(subject, 'Only key');

    const response = await h.app.inject({
      method: 'DELETE',
      url: `/v1/api-keys/${only.key.id}`,
      headers: session(subject),
    });
    expect(response.statusCode).toBe(400);
  });

  it('reports a key that never existed as missing, not as the last one', async () => {
    const subject = `ivan-${Date.now()}`;
    await signIn(subject);

    const response = await h.app.inject({
      method: 'DELETE',
      url: '/v1/api-keys/key_doesnotexist',
      headers: session(subject),
    });
    expect(response.statusCode).toBe(404);
  });

  it('revokes a key and stops accepting it', async () => {
    const subject = `frank-${Date.now()}`;
    await signIn(subject);
    await mintKey(subject, 'Keeper');
    const minted = await mintKey(subject, 'Throwaway');

    const revoked = await h.app.inject({
      method: 'DELETE',
      url: `/v1/api-keys/${minted.key.id}`,
      headers: session(subject),
    });
    expect(revoked.statusCode).toBe(200);

    const used = await h.app.inject({
      method: 'GET',
      url: '/v1/orgs/me',
      headers: { authorization: `Bearer ${minted.apiKey}` },
    });
    expect(used.statusCode).toBe(401);
  });

  it('cannot revoke a key belonging to another organization', async () => {
    const owner = `grace-${Date.now()}`;
    const stranger = `heidi-${Date.now()}`;
    await signIn(owner);
    await signIn(stranger);

    const created = await h.app.inject({
      method: 'POST',
      url: '/v1/api-keys',
      headers: session(owner),
      payload: { label: 'Owned' },
    });
    const keyId = created.json<{ key: { id: string } }>().key.id;

    await h.app.inject({
      method: 'POST',
      url: '/v1/api-keys',
      headers: session(stranger),
      payload: { label: 'Spare' },
    });

    const response = await h.app.inject({
      method: 'DELETE',
      url: `/v1/api-keys/${keyId}`,
      headers: session(stranger),
    });
    expect(response.statusCode).toBe(404);
  });
});

describe('organization rename', () => {
  it('renames from a session and refuses from an API key', async () => {
    const subject = `ivan-${Date.now()}`;
    await signIn(subject);

    const renamed = await h.app.inject({
      method: 'PATCH',
      url: '/v1/orgs/me',
      headers: session(subject),
      payload: { name: 'Ivan Industries' },
    });
    expect(renamed.json<{ org: { name: string } }>().org.name).toBe('Ivan Industries');

    const refused = await h.app.inject({
      method: 'PATCH',
      url: '/v1/orgs/me',
      headers: h.auth,
      payload: { name: 'Hijacked' },
    });
    expect(refused.statusCode).toBe(403);
  });
});

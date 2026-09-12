/**
 * The transport every server component and server action calls through.
 *
 * Nothing here throws. A failing panel has to degrade into a calm empty state
 * rather than taking the page down with it, so every outcome — a refusal, an
 * unparseable body, an API that is not running at all — comes back as a result
 * the caller can render.
 *
 * The credential is attached on the server and never reaches the browser. It is
 * read per request rather than captured once, because a signed-in person's
 * token changes while the process does not.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const cookies = vi.hoisted(() => vi.fn());

vi.mock('next/headers', () => ({ cookies }));

const { request } = await import('./http');

/** Answers one fetch with a status and a body. */
function answer(status: number, body: string, contentType = 'application/json'): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(status === 204 ? null : body, {
          status,
          headers: { 'content-type': contentType },
        }),
      ),
    ),
  );
}

beforeEach(() => {
  cookies.mockResolvedValue({ get: () => ({ value: 'session-token' }) });
  vi.stubEnv('POCKET_API_URL', 'http://api.test');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('a successful call', () => {
  it('unwraps the payload', async () => {
    answer(200, JSON.stringify({ agents: [] }));

    await expect(request('GET', '/v1/agents')).resolves.toEqual({ ok: true, data: { agents: [] } });
  });

  it('treats no content as an answer rather than a malformed one', async () => {
    answer(204, '');

    const result = await request('DELETE', '/v1/api-keys/key_1');
    expect(result.ok).toBe(true);
  });

  it('presents the signed-in person’s token', async () => {
    answer(200, '{}');
    await request('GET', '/v1/agents');

    const init = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0]?.[1];
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer session-token',
    });
  });

  it('falls back to the deployment key when nobody is signed in', async () => {
    cookies.mockResolvedValue({ get: () => undefined });
    vi.stubEnv('POCKET_API_KEY', 'pocket_sk_machine');
    answer(200, '{}');
    await request('GET', '/v1/agents');

    const init = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0]?.[1];
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer pocket_sk_machine',
    });
  });

  it('trims a trailing slash off the configured base URL', async () => {
    vi.stubEnv('POCKET_API_URL', 'http://api.test/');
    answer(200, '{}');
    await request('GET', '/v1/agents');

    const url = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0]?.[0];
    expect(String(url)).toBe('http://api.test/v1/agents');
  });
});

describe('a failing call', () => {
  it('carries the contract error code rather than throwing', async () => {
    answer(404, JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Agent not found.' } }));

    await expect(request('GET', '/v1/agents/agent_1')).resolves.toEqual({
      ok: false,
      code: 'NOT_FOUND',
      message: 'Agent not found.',
    });
  });

  it('falls back to the status when the body is not an envelope', async () => {
    answer(500, '{}');

    await expect(request('GET', '/v1/agents')).resolves.toMatchObject({
      ok: false,
      code: 'HTTP_500',
    });
  });

  it('reports an unreachable API as a result, not an exception', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('ECONNREFUSED'))),
    );

    const result = await request('GET', '/v1/agents');
    expect(result.ok).toBe(false);
  });

  it('reports a body that is not JSON as a result too', async () => {
    answer(200, '<html>gateway</html>', 'text/html');

    const result = await request('GET', '/v1/agents');
    expect(result.ok).toBe(false);
  });
});

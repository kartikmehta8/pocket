/**
 * The addresses an operator has to paste somewhere else.
 *
 * These are read from the server environment rather than derived from the
 * request, because the address a browser used to reach the dashboard is not
 * necessarily the address an agent runtime can reach the MCP server on.
 *
 * The seller is `null` rather than a guess when none is configured. The setup
 * screen puts that address into a prompt with a copy button, and a
 * plausible-looking default would hand an operator an instruction that cannot
 * work.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { query } from './http';
import { serviceUrls } from './urls';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('serviceUrls', () => {
  it('falls back to the local addresses a checkout serves on', () => {
    vi.stubEnv('NEXT_PUBLIC_MCP_URL', undefined);
    vi.stubEnv('POCKET_API_URL', undefined);
    vi.stubEnv('NEXT_PUBLIC_DOCS_URL', undefined);
    vi.stubEnv('NEXT_PUBLIC_PAID_SERVICE_URL', '');

    expect(serviceUrls()).toEqual({
      mcp: 'http://localhost:8081/mcp',
      api: 'http://localhost:8080',
      paidService: null,
      docs: 'http://localhost:3001/docs',
    });
  });

  it('takes what the deployment configured', () => {
    vi.stubEnv('NEXT_PUBLIC_MCP_URL', 'https://mcp.example.com/mcp');
    vi.stubEnv('POCKET_API_URL', 'https://api.example.com');
    vi.stubEnv('NEXT_PUBLIC_DOCS_URL', 'https://docs.example.com/docs');
    vi.stubEnv('NEXT_PUBLIC_PAID_SERVICE_URL', 'https://seller.example.com');

    expect(serviceUrls().paidService).toBe('https://seller.example.com');
    expect(serviceUrls().api).toBe('https://api.example.com');
  });

  it('trims a trailing slash, so a pasted address never doubles one', () => {
    vi.stubEnv('POCKET_API_URL', 'https://api.example.com/');
    vi.stubEnv('NEXT_PUBLIC_PAID_SERVICE_URL', 'https://seller.example.com//');
    vi.stubEnv('NEXT_PUBLIC_DOCS_URL', 'https://docs.example.com/docs/');

    const urls = serviceUrls();
    expect(urls.api).toBe('https://api.example.com');
    expect(urls.paidService).toBe('https://seller.example.com');
    expect(urls.docs).toBe('https://docs.example.com/docs');
  });

  it('reports no seller rather than guessing one', () => {
    vi.stubEnv('NEXT_PUBLIC_PAID_SERVICE_URL', '');

    expect(serviceUrls().paidService).toBeNull();
  });
});

describe('query', () => {
  it('builds nothing from nothing, so a URL keeps no stray question mark', () => {
    expect(query({})).toBe('');
    expect(query({ agentId: undefined, status: '' })).toBe('');
  });

  it('includes only the parameters that carry a value', () => {
    expect(query({ agentId: 'agent_1', limit: 25, status: undefined })).toBe(
      '?agentId=agent_1&limit=25',
    );
  });

  it('escapes a value rather than pasting it in raw', () => {
    expect(query({ q: 'a b&c=d' })).toBe('?q=a+b%26c%3Dd');
  });
});

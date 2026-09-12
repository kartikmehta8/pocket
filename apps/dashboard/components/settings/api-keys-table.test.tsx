/**
 * The key list, and what it says about revoking. Revoking is a server action,
 * which does not exist outside Next, so it is mocked.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import type { ApiKey } from '@/lib/types';

import { ApiKeysTable } from './api-keys-table';

vi.mock('@/lib/actions-account', () => ({ revokeApiKeyAction: async () => ({}) }));

/** Strips tags so visible text can be matched. */
function text(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

function key(overrides: Partial<ApiKey>): ApiKey {
  return {
    id: 'key_1',
    label: 'MCP server',
    prefix: 'pocket_sk_f764f3',
    createdAt: '2026-09-09T10:12:00.000Z',
    revokedAt: null,
    ...overrides,
  };
}

const render = (keys: ApiKey[]) =>
  renderToStaticMarkup(
    <TooltipProvider>
      <ApiKeysTable keys={keys} />
    </TooltipProvider>,
  );

describe('ApiKeysTable', () => {
  it('lists live keys before revoked ones', () => {
    const html = text(
      render([
        key({ id: 'old', label: 'Old key', revokedAt: '2026-09-09T11:00:00.000Z' }),
        key({ id: 'new', label: 'New key' }),
      ]),
    );
    expect(html.indexOf('New key')).toBeLessThan(html.indexOf('Old key'));
    expect(html).toContain('Revoked');
  });

  it('will not let the last live key be revoked', () => {
    const html = render([key({})]);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Revoke MCP server"/);
  });

  it('lets a key be revoked once another is live', () => {
    const html = render([key({ id: 'a', label: 'A' }), key({ id: 'b', label: 'B' })]);
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*aria-label="Revoke A"/);
    expect(html).toContain('aria-label="Revoke A"');
  });

  it('says so when there are no keys', () => {
    expect(text(render([]))).toContain('No keys yet');
  });
});

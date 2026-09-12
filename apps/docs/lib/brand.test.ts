/**
 * The address this deployment gives out.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { appUrl, siteUrl } from './brand';

/**
 * The address this deployment gives out.
 *
 * Every canonical link, sitemap entry and preview card is built on it, and the
 * failure it guards against has already happened on the sister app: a
 * production build addressed itself by the per-deployment Vercel host, so
 * shared links showed `pocket-dashboard-2tl3c72e5-….vercel.app` instead of the
 * product's domain.
 */
const VARIABLES = [
  'NEXT_PUBLIC_DOCS_DOMAIN',
  'NEXT_PUBLIC_APP_URL',
  'VERCEL_ENV',
  'VERCEL_PROJECT_PRODUCTION_URL',
  'VERCEL_URL',
  'NODE_ENV',
] as const;

/**
 * Sets the environment for one case, leaving every other variable unset.
 *
 * @param values The variables this case is about.
 * @remarks Through `vi.stubEnv` rather than by assignment: `NODE_ENV` is typed
 * read-only, and the stubs are undone wholesale after each case.
 */
function withEnv(values: Partial<Record<(typeof VARIABLES)[number], string>>): void {
  for (const name of VARIABLES) {
    vi.stubEnv(name, values[name]);
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('siteUrl', () => {
  it('uses the configured domain before anything Vercel says', () => {
    withEnv({
      NEXT_PUBLIC_DOCS_DOMAIN: 'docs.pocket-app.xyz',
      VERCEL_ENV: 'production',
      VERCEL_PROJECT_PRODUCTION_URL: 'wrong.vercel.app',
      VERCEL_URL: 'also-wrong.vercel.app',
    });
    expect(siteUrl()).toBe('https://docs.pocket-app.xyz');
  });

  it('strips a scheme and a path from a configured domain', () => {
    withEnv({ NEXT_PUBLIC_DOCS_DOMAIN: 'https://docs.pocket-app.xyz/docs' });
    expect(siteUrl()).toBe('https://docs.pocket-app.xyz');
  });

  it("takes the project's own domain in production, not the deployment host", () => {
    withEnv({
      VERCEL_ENV: 'production',
      VERCEL_PROJECT_PRODUCTION_URL: 'docs.pocket-app.xyz',
      VERCEL_URL: 'pocket-docs-2tl3c72e5-kartikmehta8s-projects.vercel.app',
    });
    expect(siteUrl()).toBe('https://docs.pocket-app.xyz');
  });

  it('lets a preview deployment address itself', () => {
    withEnv({
      VERCEL_ENV: 'preview',
      VERCEL_PROJECT_PRODUCTION_URL: 'docs.pocket-app.xyz',
      VERCEL_URL: 'pocket-docs-abc123.vercel.app',
    });
    expect(siteUrl()).toBe('https://pocket-docs-abc123.vercel.app');
  });

  it('assumes the documentation domain when deployed anywhere else', () => {
    withEnv({ NODE_ENV: 'production' });
    expect(siteUrl()).toBe('https://docs.pocket-app.xyz');
  });

  it('addresses itself as localhost in development', () => {
    withEnv({});
    expect(siteUrl()).toBe('http://localhost:3001');
  });
});

describe('appUrl', () => {
  it('points at the product when nothing is configured', () => {
    withEnv({});
    expect(appUrl()).toBe('https://www.pocket-app.xyz');
  });

  it('drops a trailing slash from a configured address', () => {
    withEnv({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000/' });
    expect(appUrl()).toBe('http://localhost:3000');
  });
});

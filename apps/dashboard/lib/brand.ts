/**
 * How Pocket describes itself.
 *
 * The lines the product introduces itself with: a category, what it is built
 * on, and what it does. Used by page metadata, the marketing page and the
 * sidebar.
 *
 * @remarks Kept in one file per app rather than a shared package, which would
 * mean the dashboard depending on a workspace build for three strings. The
 * matching copy lives in `apps/docs/lib/brand.ts`, the root `package.json` and
 * `README.md`. Change one and change those.
 */

/** The category, in a few words. For tab titles and the marketing page. */
export const TAGLINE = 'Spending limits for AI agents';

/**
 * The protocol the product settles on. Shown under the wordmark in the rail.
 *
 * @remarks The rail says what Pocket is built on rather than what it is: by
 * the time someone is looking at the sidebar they are already inside, and the
 * category line has stopped being news.
 */
export const POWERED_BY = 'Powered by x402';

/** What it does, in one sentence. For meta descriptions and the docs landing page. */
export const DESCRIPTION = 'Give each agent its own wallet and a hard cap it cannot raise.';

/** How the product signs itself in a shared link and a browser tab. */
export const SITE_NAME = 'Pocket';

/**
 * The domain to assume when none is configured.
 *
 * @remarks The same default `next.config.ts` applies to server-action
 * origins. Two files, one answer: change both together.
 */
const DEFAULT_DOMAIN = 'pocket-app.xyz';

/**
 * Absolute base URL of this deployment.
 *
 * @returns An origin with no trailing slash, e.g. `https://pocket-app.xyz`.
 * @remarks Metadata needs absolute URLs: a preview card is rendered by
 * somebody else's server, which cannot resolve `/og.png`. Vercel's
 * per-deployment host is preferred on a preview build so its cards point at
 * the build being previewed rather than production.
 *
 * `next.config.ts` reads the same variable to decide which origins may submit
 * a server action. Change one and look at the other.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_DOMAIN ?? '';
  if (configured !== '') {
    const apex = configured.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    return `https://${apex}`;
  }
  const deployment = process.env.VERCEL_URL ?? '';
  if (deployment !== '') return `https://${deployment}`;
  // Deployed with nothing configured, a card pointing at localhost is worse
  // than one pointing at the canonical domain, which is also what
  // `next.config.ts` assumes when the variable is missing.
  return process.env.NODE_ENV === 'production'
    ? `https://${DEFAULT_DOMAIN}`
    : 'http://localhost:3000';
}

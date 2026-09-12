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
 * somebody else's server, which cannot resolve `/og.png`.
 *
 * The order matters, and getting it wrong is visible to everyone who shares a
 * link. `VERCEL_URL` is the per-deployment host — `…-2tl3c72e5-….vercel.app` —
 * which is the right address for a preview build and the wrong one for
 * production, where it changes on every deploy and matches no domain anybody
 * recognises. Production therefore asks Vercel for the project's own domain
 * first, and only a preview falls back to addressing itself.
 *
 * `next.config.ts` reads `NEXT_PUBLIC_APP_DOMAIN` too, to decide which origins
 * may submit a server action. Change one and look at the other.
 *
 * Nothing configured and not on Vercel: a card pointing at localhost would be
 * worse than one pointing at the domain the product actually lives on.
 */
export function siteUrl(): string {
  const host = vercelHost();
  if (host !== null) return `https://${host}`;
  return process.env.NODE_ENV === 'production'
    ? `https://${DEFAULT_DOMAIN}`
    : 'http://localhost:3000';
}

/**
 * The host this deployment should call itself, from configuration.
 *
 * @returns A bare host, or `null` when nothing says.
 *
 * @remarks Vercel's own name for the project's production domain. Present on
 * every deployment, and the only variable that keeps pointing at the same place.
 */
function vercelHost(): string | null {
  const configured = clean(process.env.NEXT_PUBLIC_APP_DOMAIN);
  if (configured !== null) return configured;

  if (process.env.VERCEL_ENV === 'production') {
    const canonical = clean(process.env.VERCEL_PROJECT_PRODUCTION_URL);
    if (canonical !== null) return canonical;
  }

  return clean(process.env.VERCEL_URL);
}

/**
 * Reduces a configured value to a bare host.
 *
 * @param value Raw environment value: may carry a scheme, a path, or nothing.
 * @returns The host, or `null` when the value was empty.
 */
function clean(value: string | undefined): string | null {
  const host = (value ?? '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
  return host === '' ? null : host;
}

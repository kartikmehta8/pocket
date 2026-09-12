/**
 * How Pocket describes itself, and the address this site answers on.
 *
 * @remarks The copy must match `apps/dashboard/lib/brand.ts`, which carries
 * the same note pointing back here. The product describes itself the same way
 * in every place a reader might meet it. Kept as two files rather than a
 * shared package, which would mean both sites depending on a workspace build
 * for a handful of strings.
 */

/** How the product signs itself in a shared link and a browser tab. */
export const SITE_NAME = 'Pocket';

/** What this site is, as distinct from the product. */
export const DOCS_NAME = 'Pocket Docs';

/** The category, in a few words. */
export const TAGLINE = 'Spending limits for AI agents';

/** What it does, in one sentence. For meta descriptions and the landing page. */
export const DESCRIPTION = 'Give each agent its own wallet and a hard cap it cannot raise.';

/** The protocol the product settles on. Shown under the wordmark in the sidebar. */
export const POWERED_BY = 'Powered by x402';

/**
 * The domain to assume when none is configured.
 *
 * @remarks The `www` host rather than the apex: the apex 308-redirects, and a
 * canonical link that redirects is a canonical link a crawler has to resolve
 * before it can believe it.
 */
const DEFAULT_DOCS_DOMAIN = 'docs.pocket-app.xyz';

/** Where the product itself lives when nothing says otherwise. */
const DEFAULT_APP_URL = 'https://www.pocket-app.xyz';

/**
 * Absolute base URL of this deployment.
 *
 * @returns An origin with no trailing slash, e.g. `https://docs.pocket-app.xyz`.
 * @remarks Metadata needs absolute URLs: a preview card is rendered by
 * somebody else's server, which cannot resolve a path.
 *
 * The order matters, and getting it wrong is visible to everyone who shares a
 * link. `VERCEL_URL` is the per-deployment host — `…-2tl3c72e5-….vercel.app` —
 * which is the right address for a preview build and the wrong one for
 * production, where it changes on every deploy and matches no domain anybody
 * recognises. Production therefore asks Vercel for the project's own domain
 * first, and only a preview falls back to addressing itself.
 *
 * With nothing configured and no Vercel environment, a production build assumes
 * the documentation domain: a card pointing at localhost would be worse than
 * one pointing at the domain the site actually lives on.
 */
export function siteUrl(): string {
  const host = configuredHost();
  if (host !== null) return `https://${host}`;
  return process.env.NODE_ENV === 'production'
    ? `https://${DEFAULT_DOCS_DOMAIN}`
    : 'http://localhost:3001';
}

/**
 * Where the product itself lives, so every page can point back to it.
 *
 * @returns An origin with no trailing slash.
 */
export function appUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim().replace(/\/+$/, '');
  return configured === '' ? DEFAULT_APP_URL : configured;
}

/**
 * The host this deployment should call itself, from configuration.
 *
 * @returns A bare host, or `null` when nothing says.
 * @remarks `VERCEL_PROJECT_PRODUCTION_URL` is Vercel's own name for the
 * project's production domain. It is present on every deployment and is the
 * only variable that keeps pointing at the same place.
 */
function configuredHost(): string | null {
  const configured = clean(process.env.NEXT_PUBLIC_DOCS_DOMAIN);
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

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

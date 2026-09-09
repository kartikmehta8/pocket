/**
 * How Purse describes itself.
 *
 * One short form and one long form, used everywhere the product introduces
 * itself: page metadata, the wordmark, the footer, and the docs site.
 *
 * @remarks Kept in one file per app rather than a shared package, which would
 * mean the dashboard depending on a workspace build for two strings. The
 * matching copy lives in `apps/docs/lib/brand.ts`, the root `package.json` and
 * `README.md`. Change one and change those.
 */

/** The category, in a few words. For the wordmark, the footer and a tab title. */
export const TAGLINE = 'Spending limits for AI agents';

/** What it does, in one sentence. For meta descriptions and the docs landing page. */
export const DESCRIPTION = 'Give each agent its own wallet and a hard cap it cannot raise.';

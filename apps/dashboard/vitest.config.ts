/**
 * Test configuration for the dashboard.
 */

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Test configuration.
 *
 * @remarks Next compiles JSX itself, so the app's `tsconfig` leaves it as
 * `preserve`. Vitest has no such compiler behind it, hence the explicit
 * automatic runtime, and the `@/` alias the app imports by.
 *
 * `server-only` is stubbed because Next replaces a `'use server'` module with
 * a client proxy at build time and Vitest does not, so a component test would
 * otherwise pull a server action's whole transitive graph into the runner and
 * trip that package's guard. The real boundary is still enforced — by
 * `next build`, which is where it belongs — so this loses no coverage.
 *
 * Coverage measures `lib`, which is where the decisions are. Excluded from it
 * are the type-only modules, which compile to nothing; the server actions,
 * which only exist inside a Next request and are exercised by the API's own
 * suite on the other side of the wire; and the API client, whose every method
 * is one call to `request` with a path, already covered where that path is
 * built. Components are not measured yet and are the next thing to cover.
 */
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts'],
      exclude: [
        'lib/**/*.test.ts',
        'lib/types.ts',
        'lib/types-account.ts',
        'lib/actions.ts',
        'lib/actions-account.ts',
        'lib/actions-purchase.ts',
        'lib/api.ts',
        'lib/api-account.ts',
        'lib/marketplace.ts',
        'lib/session.ts',
      ],
      thresholds: { statements: 85, branches: 80, functions: 85, lines: 85 },
    },
  },
  resolve: {
    alias: {
      'server-only': fileURLToPath(new URL('./test/server-only-stub.ts', import.meta.url)),
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
});

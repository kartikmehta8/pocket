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
 */
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      'server-only': fileURLToPath(new URL('./test/server-only-stub.ts', import.meta.url)),
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
});

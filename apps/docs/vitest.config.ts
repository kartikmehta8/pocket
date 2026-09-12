/**
 * Test configuration for the documentation site.
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
 * Almost everything here is MDX and chrome the library renders. What is worth
 * a test is the handful of modules that decide something: the address this
 * deployment gives out, and the sidebar blocks that send a reader somewhere
 * off-site.
 */
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts', 'components/author.tsx', 'components/faucets.tsx'],
      exclude: ['lib/**/*.test.ts', 'lib/source.ts', 'lib/layout.shared.tsx'],
      thresholds: { statements: 85, branches: 80, functions: 85, lines: 85 },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
});

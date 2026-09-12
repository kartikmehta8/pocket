/**
 * Test configuration for the example seller.
 *
 * `index.ts` binds a port and registers x402 middleware, and `sources/*` are
 * thin adapters over third-party HTTP whose shapes are asserted by the catalog
 * tests. The cache is where the behaviour lives, so that is what is measured.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/sources/types.ts'],
      thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 },
    },
  },
});

/**
 * Test configuration for the domain package.
 *
 * Coverage counts the code that decides things. Barrels re-export, and the
 * type-only modules compile to nothing, so including either would move the
 * percentage without moving the amount of behaviour under test.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/types.ts', 'src/ports.ts', 'src/identity.ts'],
      thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 },
    },
  },
});

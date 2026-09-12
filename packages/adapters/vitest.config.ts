/**
 * Test configuration for the adapter package.
 *
 * The vendor clients are excluded. Exercising them means mocking Privy, Hedera
 * and The Graph deeply enough that the test asserts the mock rather than the
 * adapter, and the parts worth pinning — unit conversion, key recovery, account
 * resolution, price agreement — are pure and are measured.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/index.ts',
        'src/privy.ts',
        'src/privy-identity.ts',
        'src/graph.ts',
        'src/hedera.ts',
        'src/**/*-mocks.ts',
        'src/mocks.ts',
      ],
      thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 },
    },
  },
});

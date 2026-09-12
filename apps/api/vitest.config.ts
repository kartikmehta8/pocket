/**
 * Test configuration for the API suite.
 *
 * `globalSetup` creates and migrates a database the suite owns, so fixtures
 * never land in the one the application is serving from. The timeout is
 * generous because several cases wait on a mirror node.
 *
 * Coverage excludes the process entry point and the three operator commands.
 * Each binds a port or drives a vendor from a terminal, and exercising them in
 * a test would assert the harness rather than the service.
 *
 * The branch threshold is lower than the rest. What is left uncovered is the
 * defensive half of the vendor boundary — a mirror node answering a shape it
 * does not document, a facilitator returning a receipt with a field missing —
 * and reaching those branches means building a fake that misbehaves in one
 * specific way per branch. The behaviour they guard is already asserted from
 * the outside: the payment ends in a status, and the reservation is released.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
    globalSetup: ['tests/global-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/adopt.ts', 'src/provision-*.ts', 'src/context.ts'],
      thresholds: { statements: 90, branches: 80, functions: 90, lines: 90 },
    },
    env: {
      DATABASE_URL:
        process.env['TEST_DATABASE_URL'] ?? 'postgres://pocket:pocket@localhost:5434/pocket_test',
    },
  },
});

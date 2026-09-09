import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
    // Creates and migrates a database the suite owns, so fixtures never land
    // in the one the application is serving from.
    globalSetup: ['tests/global-setup.ts'],
    env: {
      DATABASE_URL:
        process.env['TEST_DATABASE_URL'] ?? 'postgres://pocket:pocket@localhost:5434/pocket_test',
    },
  },
});

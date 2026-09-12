/**
 * Test configuration for the MCP server.
 *
 * `index.ts` is the process entry point: it binds a port and wires Express, and
 * exercising it in a unit test would be testing Express rather than Pocket.
 * What matters here is the tool surface, which is covered directly.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 },
    },
  },
});

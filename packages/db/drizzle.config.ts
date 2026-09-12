/**
 * Drizzle configuration: where the schema lives and which database to push it
 * to.
 */

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './dist/schema/index.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://pocket:pocket@localhost:5434/pocket',
  },
});

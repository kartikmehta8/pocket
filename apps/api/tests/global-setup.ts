/**
 * Gives the suite a database of its own.
 *
 * The tests create organizations, agents and payments by the dozen. Pointed at
 * the same database the application uses, they bury real data in fixtures, and
 * the pre-commit hook runs them on every commit. So the suite gets its own
 * database, created here if it does not exist and rebuilt from the schema.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from 'pg';

const run = promisify(execFile);

/** Where the tests read and write, unless the environment overrides it. */
const TEST_DATABASE_URL =
  process.env['TEST_DATABASE_URL'] ?? 'postgres://pocket:pocket@localhost:5434/pocket_test';

/**
 * Creates the test database when absent, then brings its schema up to date.
 *
 * @throws When the server is unreachable, because a suite silently falling
 *   back to the application's database is the problem this exists to prevent.
 */
export async function setup(): Promise<void> {
  const url = new URL(TEST_DATABASE_URL);
  const name = url.pathname.slice(1);

  const maintenance = new URL(TEST_DATABASE_URL);
  maintenance.pathname = '/postgres';
  const client = new Client({ connectionString: maintenance.toString() });
  await client.connect();
  try {
    const existing = await client.query('select 1 from pg_database where datname = $1', [name]);
    // No CREATE DATABASE IF NOT EXISTS in Postgres, and the identifier cannot
    // be a bound parameter, so the name is quoted rather than interpolated raw.
    if (existing.rowCount === 0) {
      await client.query(`create database "${name.replaceAll('"', '""')}"`);
    }
  } finally {
    await client.end();
  }

  process.env['DATABASE_URL'] = TEST_DATABASE_URL;
  await run('pnpm', ['--filter', '@pocket/db', 'push', '--force'], {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}

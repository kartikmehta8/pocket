/**
 * Database connection and transaction plumbing.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

/**
 * Postgres returns `numeric` as a string by default, which is what
 * {@link schema.baseUnits} expects. Registering a parser that produced a
 * JavaScript number here would silently reintroduce float money, so this
 * assertion documents that we rely on the string default.
 */
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => value);

/** The Drizzle handle, typed against the full schema. */
export type Database = NodePgDatabase<typeof schema>;

/** A handle inside an open transaction. Structurally identical to {@link Database}. */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

let pool: pg.Pool | undefined;
let database: Database | undefined;

/**
 * Returns the process-wide database handle, opening the pool on first use.
 *
 * @param connectionString - Postgres URL. Read from `DATABASE_URL` when absent.
 * @returns A Drizzle database bound to the Purse schema.
 * @throws {Error} When no connection string is available.
 */
export function getDb(connectionString?: string): Database {
  if (database !== undefined) return database;
  const url = connectionString ?? process.env.DATABASE_URL;
  if (url === undefined || url === '') {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  }
  pool = new pg.Pool({ connectionString: url, max: 10 });
  database = drizzle(pool, { schema });
  return database;
}

/** Closes the pool. Used by tests and by graceful shutdown. */
export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
  database = undefined;
}

/**
 * Hashes an API key for storage and lookup.
 *
 * @param plaintext - The key as presented by the caller.
 * @returns Lower-case hex SHA-256.
 * @remarks SHA-256 rather than a password KDF is deliberate: these are
 * high-entropy random keys, not user-chosen passwords, so key stretching buys
 * nothing and would add latency to every request.
 */
export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext, 'utf8').digest('hex');
}

/**
 * Compares two hex digests without leaking their difference through timing.
 *
 * @param a - First hex digest.
 * @param b - Second hex digest.
 * @returns Whether the digests match.
 */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

export { schema };

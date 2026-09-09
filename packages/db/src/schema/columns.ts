/**
 * Shared column builders.
 *
 * Money never touches a JavaScript float. Every financial column is an
 * arbitrary-precision Postgres integer holding a count of the asset's smallest
 * unit, surfaced to TypeScript as `bigint`.
 */

import { customType } from 'drizzle-orm/pg-core';

/**
 * A money column: `numeric(78, 0)` in Postgres, `bigint` in TypeScript.
 *
 * @remarks 78 digits comfortably exceeds a 256-bit integer, so a token with
 * 18 decimals and a large supply still fits without truncation.
 */
export const baseUnits = customType<{ data: bigint; driverData: string }>({
  dataType: () => 'numeric(78, 0)',
  fromDriver: (value) => BigInt(value),
  toDriver: (value) => value.toString(),
});

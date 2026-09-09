/**
 * Idempotency for autonomous purchases.
 *
 * An agent that times out will retry. Without a stable key that retry is a
 * second payment for the same thing, which is the most expensive bug this
 * system could have — so the key is derived rather than left to the caller.
 */

import { createHash } from 'node:crypto';

/**
 * Derives a stable idempotency key for a purchase.
 *
 * @param parts - Values that identify this purchase: agent, resource, task
 *   budget and price.
 * @returns A hex digest.
 * @remarks Including the price matters. A seller that raises its price is
 *   quoting a different purchase, and silently replaying the old, cheaper
 *   payment against it would hand the buyer data they did not pay for.
 *
 *   A buyer who means to buy the same thing twice passes an explicit
 *   `purchaseId` instead.
 */
export function purchaseIdempotencyKey(parts: readonly string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 40);
}

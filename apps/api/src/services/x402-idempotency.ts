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

/** Shortest and longest a derived key may stay live, in seconds. */
const WINDOW_FLOOR_SECONDS = 60;
const WINDOW_CEILING_SECONDS = 900;

/**
 * The keys a derived purchase will accept a match on, newest first.
 *
 * A key that never expires cannot tell a retry from a later, genuine
 * repurchase, so the same agent could buy a given feed exactly once and every
 * attempt after that would collide with the first. Stamping the key with the
 * window it was minted in fixes that: retries land on the same stamp and
 * collide as they should, while a purchase made later mints a fresh one.
 *
 * Two stamps are returned because a retry can cross a window boundary. Looking
 * only at the current one would let that retry pay a second time, which is the
 * exact failure idempotency exists to prevent.
 *
 * @param base - The derived key, from {@link purchaseIdempotencyKey}.
 * @param maxTimeoutSeconds - Validity the seller put on its own quote, which is
 *   how long a retry is still the same purchase.
 * @param now - Current time, injectable for tests.
 * @returns The current window's key followed by the previous window's.
 */
export function purchaseIdempotencyKeys(
  base: string,
  maxTimeoutSeconds: number | undefined,
  now: number = Date.now(),
): readonly string[] {
  const seconds = Math.min(
    WINDOW_CEILING_SECONDS,
    Math.max(WINDOW_FLOOR_SECONDS, maxTimeoutSeconds ?? WINDOW_FLOOR_SECONDS),
  );
  const window = Math.floor(now / (seconds * 1000));
  return [`${base}:${String(window)}`, `${base}:${String(window - 1)}`];
}

/**
 * The keys a purchase will accept a match on.
 *
 * An explicit `purchaseId` is the caller's own key and keeps exact, unexpiring
 * semantics, because a caller that chose a key means it. A derived key is
 * stamped with its window instead, so the same resource can be bought again
 * later without the attempt looking like a duplicate of the first.
 *
 * @param purchaseId - Caller-supplied key, when there is one.
 * @param parts - Values identifying the purchase: agent, resource, task budget
 *   and price.
 * @param maxTimeoutSeconds - Validity the seller put on its own quote.
 * @returns Keys to match on, the first being the one a new payment is recorded
 *   under.
 */
export function keysForPurchase(
  purchaseId: string | undefined,
  parts: readonly string[],
  maxTimeoutSeconds: number | undefined,
): readonly string[] {
  if (purchaseId !== undefined) return [purchaseId];
  return purchaseIdempotencyKeys(purchaseIdempotencyKey(parts), maxTimeoutSeconds);
}

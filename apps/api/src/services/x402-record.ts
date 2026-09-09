/**
 * How an authorization decision becomes a payment row.
 *
 * Two small rules that decide what a recorded attempt claims about itself:
 * the status it carries, and whether it holds the idempotency key.
 */

import type { AuthorizationDecision, PaymentStatus } from '@pocket/core';

/**
 * The status an attempt is recorded under.
 *
 * @param outcome - What the policy engine decided.
 * @returns The payment status matching that decision.
 */
export function statusFor(outcome: AuthorizationDecision['outcome']): PaymentStatus {
  if (outcome === 'deny') return 'blocked';
  return outcome === 'require_approval' ? 'awaiting_approval' : 'approved';
}

/**
 * The idempotency key an attempt keeps, if any.
 *
 * A blocked attempt keeps none. It reserved nothing, so there is no second
 * charge to guard against, and holding the key would leave the agent unable to
 * retry once the operator raises the very limit that blocked it.
 *
 * @param status - How the attempt was recorded.
 * @param keys - Keys this attempt matched on, the first being its own.
 * @returns The key to store, or `null` to leave the row unkeyed.
 */
export function keyToRetain(status: PaymentStatus, keys: readonly string[]): string | null {
  return status === 'blocked' ? null : (keys[0] ?? null);
}

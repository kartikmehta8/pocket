/**
 * Presenting a signed payment to the seller, and recording what came back.
 *
 * This is the half of a purchase where the money is already committed: the
 * wallet has signed and the payment sits in `approved`, which counts against
 * the agent's daily spend. Anything that throws in here and is not recorded
 * would leave that reservation standing for good, so every path ends in a
 * settlement record.
 */

import type { Database } from '@pocket/db';
import { recordSettlement } from './x402-settle.js';
import { payForResource } from './x402-http.js';
import { paymentToJson } from '../serialize.js';
import type { X402PaymentPayload } from './x402-types.js';
import type { PurchaseOutcome } from './x402-purchase.js';

/** Where to record the outcome, and how to render a receipt link. */
export interface PresentDeps {
  db: Database;
  orgId: string;
  paymentId: string;
  explorer: (hash: string) => string;
}

/**
 * Hands the signed payment over and reports what the seller did with it.
 *
 * @param deps - Database handle, tenant, payment and explorer link builder.
 * @param url - The resource being bought.
 * @param payload - The signed x402 payload.
 * @returns Paid when the seller served the resource, failed otherwise. Never
 *   throws: a failure that escaped would strand the reservation.
 */
export async function presentToSeller(
  deps: PresentDeps,
  url: URL,
  payload: X402PaymentPayload,
): Promise<PurchaseOutcome> {
  const abandon = async (code: string, message: string): Promise<PurchaseOutcome> => {
    const failed = await recordSettlement(deps.db, deps.orgId, deps.paymentId, {
      success: false,
      reason: message,
    });
    return { status: 'failed', code, message, payment: paymentToJson(failed, deps.explorer) };
  };

  let paid;
  try {
    paid = await payForResource(url, payload);
  } catch (cause) {
    // A seller that goes quiet after signing must cost the budget nothing.
    return await abandon(
      'UPSTREAM_UNAVAILABLE',
      `The seller could not be reached: ${String(cause)}`,
    );
  }

  if (paid.kind === 'rejected') {
    return await abandon(
      'SETTLEMENT_REJECTED',
      `The seller refused the payment (${paid.status}): ${paid.detail}`,
    );
  }

  const transactionId =
    typeof paid.settlement?.['transaction'] === 'string'
      ? paid.settlement['transaction']
      : undefined;
  const settled = await recordSettlement(deps.db, deps.orgId, deps.paymentId, {
    success: true,
    transactionId,
  });

  return {
    status: 'paid',
    result: paid.body,
    payment: paymentToJson(settled, deps.explorer),
    settlement: paid.settlement,
  };
}

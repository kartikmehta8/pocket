/**
 * Human approval decisions on escalated payments.
 */

import { newId } from '@pocket/core';
import type { Transaction } from '../client.js';
import { approvals } from '../schema/index.js';

/**
 * Records a human decision on a payment policy escalated.
 *
 * @param tx - Open transaction, so the decision commits with the status change
 *   it justifies.
 * @param input - Payment, decider identity, verdict and optional note.
 */
export async function recordApproval(
  tx: Transaction,
  input: { paymentId: string; decidedBy: string; approved: boolean; note?: string | undefined },
): Promise<void> {
  await tx.insert(approvals).values({
    id: newId('apr'),
    paymentId: input.paymentId,
    decidedBy: input.decidedBy,
    approved: input.approved,
    note: input.note ?? null,
  });
}

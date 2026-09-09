/**
 * Recording what the facilitator did.
 *
 * Pocket does not submit the x402 transaction — the facilitator does — so the
 * outcome has to be reported back rather than observed. This is the one place
 * that writes it, shared by the `settlement` route an external buyer calls and
 * by the purchase flow that runs inside the API.
 */

import { PocketError, type Payment } from '@pocket/core';
import {
  appendAuditEvent,
  chargeTaskBudget,
  getPayment,
  updatePaymentStatus,
  type Database,
} from '@pocket/db';

/** What the facilitator reported. */
export interface SettlementReport {
  success: boolean;
  /** Hedera transaction id, when the facilitator returned one. */
  transactionId?: string | undefined;
  reason?: string | undefined;
}

/**
 * Records a settlement outcome against an authorized payment.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope.
 * @param paymentId - The payment the facilitator acted on.
 * @param report - What happened.
 * @returns The updated payment row.
 * @throws {PocketError} `NOT_FOUND` when the payment is not in this
 *   organization, or `CONFLICT` when it is in a state that cannot settle. A
 *   payment that policy blocked has no transaction to report on.
 * @remarks On failure the task-budget reservation is released, because the
 *   money definitively did not move. It is never released on an uncertain
 *   outcome: that would let an agent respend funds still in flight.
 */
export async function recordSettlement(
  db: Database,
  orgId: string,
  paymentId: string,
  report: SettlementReport,
): Promise<Payment> {
  const payment = await getPayment(db, orgId, paymentId);
  if (payment === null) throw new PocketError('NOT_FOUND', 'Payment not found.');
  if (payment.status !== 'approved' && payment.status !== 'submitted') {
    throw new PocketError('CONFLICT', `Payment is ${payment.status} and cannot be settled.`, {
      status: payment.status,
    });
  }

  if (!report.success) {
    const failed = await updatePaymentStatus(db, payment.id, { status: 'failed' });
    if (payment.taskBudgetId !== null) {
      const taskBudgetId = payment.taskBudgetId;
      await db.transaction((tx) => chargeTaskBudget(tx, taskBudgetId, -payment.amount));
    }
    await appendAuditEvent(db, {
      orgId,
      actorType: 'system',
      action: 'payment.failed',
      subjectType: 'payment',
      subjectId: payment.id,
      payload: { flow: 'x402', reason: report.reason ?? 'The facilitator reported a failure.' },
    });
    return failed;
  }

  const settled = await updatePaymentStatus(db, payment.id, {
    status: 'settled',
    txHash: report.transactionId ?? null,
    settledAt: new Date(),
  });
  await appendAuditEvent(db, {
    orgId,
    actorType: 'system',
    action: 'payment.settled',
    subjectType: 'payment',
    subjectId: payment.id,
    payload: { flow: 'x402', transactionId: report.transactionId ?? null },
  });
  return settled;
}

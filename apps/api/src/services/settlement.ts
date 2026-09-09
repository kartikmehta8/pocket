/**
 * Settlement: turning an authorized payment into an on-chain transfer.
 *
 * Settlement runs outside the authorization transaction, so the payment row
 * always describes what is actually true. `approved` means Pocket said yes,
 * `submitted` means a hash exists, `settled` means the chain confirmed it, and
 * `failed` means it will not happen. A reserved budget is released only on
 * `failed`, never on a merely uncertain outcome.
 */

import {
  PocketError,
  type ChainProvider,
  type Payment,
  type WalletProvider,
  type AssetId,
  type ChainId,
} from '@pocket/core';
import { appendAuditEvent, chargeTaskBudget, updatePaymentStatus, type Database } from '@pocket/db';

/** Collaborators settlement needs. */
export interface SettlementDeps {
  db: Database;
  wallet: WalletProvider;
  chain: ChainProvider;
  logger: { error: (context: object, message: string) => void };
}

/**
 * Releases a task budget reservation after a definitive failure.
 *
 * @param deps - Database handle.
 * @param payment - The failed payment.
 * @remarks Only called for `failed`. Releasing on a timeout would let an agent
 * respend money that may still be in flight.
 */
async function releaseReservation(deps: SettlementDeps, payment: Payment): Promise<void> {
  if (payment.taskBudgetId === null) return;
  const taskBudgetId = payment.taskBudgetId;
  await deps.db.transaction(async (tx) => {
    await chargeTaskBudget(tx, taskBudgetId, -payment.amount);
  });
}

/**
 * Records a terminal failure against a payment.
 *
 * @param deps - Collaborators.
 * @param orgId - Tenant scope.
 * @param payment - The payment that failed.
 * @param reason - Client-safe explanation for the audit trail.
 * @returns The payment in its `failed` state.
 */
async function markFailed(
  deps: SettlementDeps,
  orgId: string,
  payment: Payment,
  reason: string,
): Promise<Payment> {
  const failed = await updatePaymentStatus(deps.db, payment.id, { status: 'failed' });
  await releaseReservation(deps, payment);
  await appendAuditEvent(deps.db, {
    orgId,
    actorType: 'system',
    action: 'payment.failed',
    subjectType: 'payment',
    subjectId: payment.id,
    payload: { reason },
  });
  return failed;
}

/**
 * Signs, broadcasts and confirms a payment.
 *
 * @param deps - Database, wallet provider, chain provider and logger.
 * @param orgId - Tenant scope.
 * @param payment - An `approved` payment.
 * @param providerWalletId - The wallet provider's identifier for the payer.
 * @param fromAddress - The payer's public address.
 * @returns The payment in its final state: `settled`, `submitted` when the
 *   receipt could not be confirmed in time, or `failed`.
 * @remarks Never throws for a settlement problem. The caller receives a
 *   payment whose status is the answer, because an exception here would leave
 *   the agent unable to tell "did not happen" from "do not know".
 */
export async function settlePayment(
  deps: SettlementDeps,
  orgId: string,
  payment: Payment,
  providerWalletId: string,
  fromAddress = '',
): Promise<Payment> {
  // Hedera will not let an account receive a token it has not opted into, so
  // the transfer would revert and burn gas. Catching it here turns an opaque
  // on-chain failure into a reason an operator can act on. `null` means the
  // question does not apply or could not be answered, and is not treated as a
  // refusal.
  const associated = await deps.chain.isTokenAssociated(
    payment.recipient,
    payment.asset as AssetId,
  );
  if (associated === false) {
    return markFailed(
      deps,
      orgId,
      payment,
      `Recipient ${payment.recipient} is not associated with ${payment.asset} and cannot receive it.`,
    );
  }

  let txHash: string;
  try {
    const submitted = await deps.wallet.sendPayment({
      providerWalletId,
      from: fromAddress,
      to: payment.recipient,
      amount: payment.amount,
      asset: payment.asset as AssetId,
      chain: payment.chain as ChainId,
      // Only a blocked payment has no key, and a blocked payment never
      // reaches settlement. Its own id is a stable fallback either way.
      idempotencyKey: payment.idempotencyKey ?? payment.id,
    });
    txHash = submitted.txHash;
  } catch (cause) {
    deps.logger.error(
      { paymentId: payment.id, code: PocketError.is(cause) ? cause.code : 'INTERNAL_ERROR' },
      'Broadcast failed',
    );
    return markFailed(deps, orgId, payment, 'The wallet provider rejected the transaction.');
  }

  const submitted = await updatePaymentStatus(deps.db, payment.id, { status: 'submitted', txHash });
  await appendAuditEvent(deps.db, {
    orgId,
    actorType: 'system',
    action: 'payment.submitted',
    subjectType: 'payment',
    subjectId: payment.id,
    payload: { txHash, explorerUrl: deps.chain.explorerUrl(txHash) },
  });

  try {
    const receipt = await deps.chain.waitForReceipt(txHash);
    if (!receipt.success) {
      return await markFailed(deps, orgId, submitted, 'The transaction reverted on chain.');
    }
  } catch (cause) {
    // A missing receipt is not evidence of failure. Leave the payment
    // `submitted` with its hash so an operator can reconcile it, and keep the
    // budget reserved because the money may well have moved.
    deps.logger.error({ paymentId: payment.id, txHash }, 'Receipt not confirmed in time');
    await appendAuditEvent(deps.db, {
      orgId,
      actorType: 'system',
      action: 'payment.unconfirmed',
      subjectType: 'payment',
      subjectId: payment.id,
      payload: { txHash, note: String(PocketError.is(cause) ? cause.message : cause) },
    });
    return submitted;
  }

  const settled = await updatePaymentStatus(deps.db, payment.id, {
    status: 'settled',
    txHash,
    settledAt: new Date(),
  });
  await appendAuditEvent(deps.db, {
    orgId,
    actorType: 'system',
    action: 'payment.settled',
    subjectType: 'payment',
    subjectId: payment.id,
    payload: { txHash, explorerUrl: deps.chain.explorerUrl(txHash) },
  });
  return settled;
}

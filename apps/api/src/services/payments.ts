/**
 * The payment orchestrator.
 *
 * The shape of this module is dictated by one rule: never hold a database
 * transaction open across a network call to a chain. So authorization and
 * reservation commit first, settlement happens afterwards, and the payment row
 * moves through explicit states that always describe reality.
 */

import {
  PocketError,
  newId,
  type MarketDataProvider,
  type AuthorizationDecision,
  type Payment,
  type PaymentRequest,
  type PaymentStatus,
} from '@pocket/core';
import {
  appendAuditEvent,
  assertSameRequest,
  chargeTaskBudget,
  findByIdempotencyKey,
  insertPayment,
  lockAgent,
  type Database,
} from '@pocket/db';
import { decisionToJson } from '../serialize.js';
import { decide, loadAuthorizationContext } from './authorization.js';
import { priceIfRequired } from './pricing.js';
import { settlePayment, type SettlementDeps } from './settlement.js';

/** Collaborators the orchestrator needs. */
export interface PaymentDeps extends SettlementDeps {
  db: Database;
  market: MarketDataProvider;
}

/** Result of an execution attempt. The decision explains the status. */
export interface PaymentResult {
  payment: Payment;
  decision: AuthorizationDecision;
  replayed: boolean;
}

/** Maps an authorization outcome to the status the payment row starts in. */
function initialStatus(outcome: AuthorizationDecision['outcome']): PaymentStatus {
  if (outcome === 'deny') return 'blocked';
  if (outcome === 'require_approval') return 'awaiting_approval';
  return 'approved';
}

/**
 * Evaluates a payment without recording or settling anything.
 *
 * @param deps - Database handle.
 * @param orgId - Tenant scope.
 * @param request - The parsed payment request.
 * @returns The verdict an execution would reach right now.
 * @remarks A preview is advisory. Budgets move, so execution re-decides under
 * a lock rather than trusting this answer.
 */
export async function previewPayment(
  deps: PaymentDeps,
  orgId: string,
  request: PaymentRequest,
): Promise<AuthorizationDecision> {
  const context = await loadAuthorizationContext(deps.db, orgId, request);
  const priced = await priceIfRequired(deps.market, context.policy, context.amount, request.asset);
  return decide(context, request, priced.usdCents);
}

/**
 * Authorizes, records and settles a payment.
 *
 * @param deps - Database, wallet provider, chain provider and logger.
 * @param orgId - Tenant scope.
 * @param idempotencyKey - Caller-supplied key. A replay returns the original
 *   payment untouched.
 * @param request - The parsed payment request.
 * @returns The payment and the decision that produced its status.
 * @throws {PocketError} `IDEMPOTENCY_KEY_REUSED` when the key was already used
 *   for different money, `NOT_FOUND` for an unknown agent, or
 *   `WALLET_NOT_PROVISIONED` when an authorized agent has no wallet.
 */
export async function executePayment(
  deps: PaymentDeps,
  orgId: string,
  idempotencyKey: string,
  request: PaymentRequest,
): Promise<PaymentResult> {
  const existing = await findByIdempotencyKey(deps.db, orgId, idempotencyKey);
  if (existing !== null) {
    const context = await loadAuthorizationContext(deps.db, orgId, request);
    assertSameRequest(existing, {
      agentId: request.agentId,
      amount: context.amount,
      asset: request.asset,
      chain: request.chain,
      recipient: request.recipient,
    });
    const priced = await priceIfRequired(
      deps.market,
      context.policy,
      context.amount,
      request.asset,
    );
    return {
      payment: existing,
      decision: decide(context, request, priced.usdCents),
      replayed: true,
    };
  }

  const { payment, decision, providerWalletId, walletAddress } = await deps.db.transaction(
    async (tx) => {
      await lockAgent(tx, request.agentId);
      const context = await loadAuthorizationContext(tx, orgId, request);
      const priced = await priceIfRequired(
        deps.market,
        context.policy,
        context.amount,
        request.asset,
      );
      const verdict = decide(context, request, priced.usdCents);
      const status = initialStatus(verdict.outcome);

      const row = await insertPayment(tx, {
        id: newId('pay'),
        orgId,
        agentId: request.agentId,
        taskBudgetId: request.taskBudgetId ?? null,
        idempotencyKey,
        amount: context.amount,
        asset: request.asset,
        chain: request.chain,
        recipient: request.recipient.toLowerCase(),
        category: request.category,
        reason: request.reason,
        resource: request.resource ?? null,
        initiatedBy: request.initiatedBy,
        status,
        denialCode: verdict.primaryDenialCode,
        // Stored in the wire shape: money as decimal strings, not base units,
        // so the evidence reads the same as what the agent was told.
        decision: decisionToJson(verdict, request.asset),
        txHash: null,
      });

      // Reserve the task budget the moment the payment is authorized, so a burst
      // of concurrent requests cannot each see the same unspent headroom.
      if (status !== 'blocked' && context.taskBudget !== null) {
        await chargeTaskBudget(tx, context.taskBudget.id, context.amount);
      }

      await appendAuditEvent(tx, {
        orgId,
        actorType: request.initiatedBy === 'human' ? 'human' : 'agent',
        actorId: request.agentId,
        action: `payment.${status}`,
        subjectType: 'payment',
        subjectId: row.id,
        payload: {
          amount: request.amount,
          asset: request.asset,
          recipient: row.recipient,
          category: request.category,
          reason: request.reason,
          outcome: verdict.outcome,
          violations: verdict.violations.map((violation) => violation.code),
          ...(priced.quotes.length > 0 ? { priceQuotes: priced.quotes } : {}),
          ...(priced.reason === undefined ? {} : { pricingIssue: priced.reason }),
        },
      });

      return {
        payment: row,
        decision: verdict,
        providerWalletId: context.wallet?.providerWalletId ?? null,
        walletAddress: context.wallet?.address ?? '',
      };
    },
  );

  if (payment.status !== 'approved') {
    return { payment, decision, replayed: false };
  }

  if (providerWalletId === null) {
    throw new PocketError('WALLET_NOT_PROVISIONED', 'Agent has no wallet to pay from.', {
      agentId: request.agentId,
    });
  }

  const settled = await settlePayment(deps, orgId, payment, providerWalletId, walletAddress);
  return { payment: settled, decision, replayed: false };
}

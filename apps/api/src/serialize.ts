/**
 * Domain-to-JSON conversion.
 *
 * The wire format never carries a `bigint` and never carries a JSON number for
 * money. Every amount leaves as a decimal string beside its asset, so a
 * consumer cannot lose precision by parsing it into a float by accident.
 */

import {
  decimalsOf,
  formatAmount,
  isAssetId,
  type AuditEvent,
  type AuthorizationDecision,
  type Payment,
  type PolicyViolation,
  type TaskBudget,
} from '@purse/core';

/**
 * Formats a base-unit amount for the wire.
 *
 * @param amount - Amount in base units.
 * @param asset - Asset ticker, used for its precision.
 * @returns A decimal string, or the raw base units when the asset is unknown.
 */
export function money(amount: bigint, asset: string): string {
  return isAssetId(asset) ? formatAmount(amount, decimalsOf(asset)) : amount.toString();
}

/** JSON shape of a payment, matching API_CONTRACT.md. */
export interface PaymentJson {
  id: string;
  agentId: string;
  agentName: string;
  amount: string;
  asset: string;
  chain: string;
  recipient: string;
  category: string;
  reason: string;
  resource: string | null;
  initiatedBy: string;
  status: string;
  denialCode: string | null;
  txHash: string | null;
  explorerUrl: string | null;
  taskBudgetId: string | null;
  createdAt: string;
  settledAt: string | null;
}

/**
 * Serialises a payment.
 *
 * @param payment - Stored payment, joined with its agent name.
 * @param explorerUrl - Explorer link builder, applied only when a hash exists.
 * @returns The wire representation.
 */
export function paymentToJson(
  payment: Payment & { agentName?: string },
  explorerUrl: (txHash: string) => string,
): PaymentJson {
  return {
    id: payment.id,
    agentId: payment.agentId,
    agentName: payment.agentName ?? '',
    amount: money(payment.amount, payment.asset),
    asset: payment.asset,
    chain: payment.chain,
    recipient: payment.recipient,
    category: payment.category,
    reason: payment.reason,
    resource: payment.resource,
    initiatedBy: payment.initiatedBy,
    status: payment.status,
    denialCode: payment.denialCode,
    txHash: payment.txHash,
    explorerUrl: payment.txHash === null ? null : explorerUrl(payment.txHash),
    taskBudgetId: payment.taskBudgetId,
    createdAt: payment.createdAt.toISOString(),
    settledAt: payment.settledAt?.toISOString() ?? null,
  };
}

/**
 * Violation detail keys whose values are money in base units.
 *
 * @remarks The decision engines are pure and know nothing about an asset's
 * precision, so they report money as base units. Converting here keeps the
 * engines simple while honouring the rule that money on the wire is always a
 * decimal string. Any key not listed passes through untouched.
 */
const MONEY_DETAIL_KEYS = new Set([
  'amount',
  'maxTransactionAmount',
  'perTransactionLimit',
  'spentToday',
  'dailyLimit',
  'taskSpent',
  'taskLimit',
]);

/**
 * Rewrites a violation's money details as decimal strings.
 *
 * @param violation - Violation as produced by a decision engine.
 * @param asset - Asset supplying the precision.
 * @returns The violation with money details in decimal form.
 */
function violationToJson(violation: PolicyViolation, asset: string) {
  if (violation.details === undefined) return violation;
  const details: Record<string, string> = {};
  for (const [key, value] of Object.entries(violation.details)) {
    details[key] = MONEY_DETAIL_KEYS.has(key) ? money(BigInt(value), asset) : value;
  }
  return { ...violation, details };
}

/**
 * Serialises an authorization decision.
 *
 * @param decision - Combined policy and budget verdict.
 * @param asset - Asset the headroom and money details are denominated in.
 * @returns The wire representation, with every amount as a decimal string.
 */
export function decisionToJson(decision: AuthorizationDecision, asset: string) {
  const { headroom } = decision;
  return {
    outcome: decision.outcome,
    violations: decision.violations.map((violation) => violationToJson(violation, asset)),
    approvalReasons: decision.approvalReasons,
    asset,
    headroom: {
      dailyRemaining: money(headroom.dailyRemaining, asset),
      dailyRemainingAfter: money(headroom.dailyRemainingAfter, asset),
      taskRemaining: headroom.taskRemaining === null ? null : money(headroom.taskRemaining, asset),
      taskRemainingAfter:
        headroom.taskRemainingAfter === null ? null : money(headroom.taskRemainingAfter, asset),
    },
  };
}

/**
 * Serialises a task budget, including its derived remaining amount.
 *
 * @param task - Stored task budget.
 * @returns The wire representation.
 */
export function taskBudgetToJson(task: TaskBudget) {
  const left = task.limit - task.spent;
  return {
    id: task.id,
    agentId: task.agentId,
    label: task.label,
    asset: task.asset,
    limit: money(task.limit, task.asset),
    spent: money(task.spent, task.asset),
    remaining: money(left > 0n ? left : 0n, task.asset),
    closedAt: task.closedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
  };
}

/**
 * Serialises an audit event.
 *
 * @param event - Stored audit event.
 * @returns The wire representation.
 */
export function auditEventToJson(event: AuditEvent) {
  return {
    id: event.id,
    actorType: event.actorType,
    actorId: event.actorId,
    action: event.action,
    subjectType: event.subjectType,
    subjectId: event.subjectId,
    payload: event.payload,
    createdAt: event.createdAt.toISOString(),
  };
}

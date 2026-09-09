/**
 * Assembles the facts the decision engines need.
 *
 * The engines in `@purse/core` are pure. This module is the only place that
 * knows how to load their inputs, which keeps the rules themselves free of
 * database concerns and exhaustively testable.
 */

import {
  PurseError,
  authorizePayment,
  decimalsOf,
  isAssetId,
  isChainId,
  parseAmount,
  type AuthorizationDecision,
  type EvaluablePolicy,
  type PaymentCategory,
  type PaymentRequest,
  type Agent,
  type Budget,
  type TaskBudget,
  type Wallet,
} from '@purse/core';
import {
  getAgentBundle,
  getTaskBudget,
  listKnownRecipients,
  sumSpendToday,
  type Database,
  type Transaction,
} from '@purse/db';

/** Everything loaded from storage in order to decide on one payment. */
export interface AuthorizationContext {
  agent: Agent;
  wallet: Wallet | null;
  budget: Budget | null;
  policy: EvaluablePolicy | null;
  taskBudget: TaskBudget | null;
  spentToday: bigint;
  knownRecipients: Set<string>;
  /** The request amount, parsed to base units at the asset's precision. */
  amount: bigint;
}

/**
 * Converts a stored policy row into the engine's input shape.
 *
 * @param row - Policy as persisted, or `null` when none is configured.
 * @returns The evaluable policy, or `null` which the engine treats as deny.
 * @remarks Unrecognised assets, chains and categories are dropped rather than
 * passed through. Dropping narrows the allowlist, so an unknown value can only
 * ever make the policy stricter.
 */
export function toEvaluablePolicy(
  row: {
    allowedAssets: string[];
    allowedChains: string[];
    allowedCategories: string[];
    maxTransactionAmount: bigint;
    trustedRecipients: string[];
    unknownRecipientBehaviour: string;
    approvalThreshold: bigint | null;
    maxUsdCents: bigint | null;
  } | null,
): EvaluablePolicy | null {
  if (row === null) return null;
  const behaviour = row.unknownRecipientBehaviour;
  return {
    allowedAssets: row.allowedAssets.filter(isAssetId),
    allowedChains: row.allowedChains.filter(isChainId),
    allowedCategories: row.allowedCategories as PaymentCategory[],
    maxTransactionAmount: row.maxTransactionAmount,
    trustedRecipients: row.trustedRecipients.map((address) => address.toLowerCase()),
    unknownRecipientBehaviour:
      behaviour === 'require_approval' || behaviour === 'allow' ? behaviour : 'block',
    ...(row.approvalThreshold === null ? {} : { approvalThreshold: row.approvalThreshold }),
    ...(row.maxUsdCents === null ? {} : { maxUsdCentsPerTransaction: row.maxUsdCents }),
  };
}

/**
 * Loads every fact required to authorize a payment.
 *
 * @param db - Database or transaction handle. Pass the transaction during
 *   execution so the read happens under the agent row lock.
 * @param orgId - Tenant scope.
 * @param request - The parsed payment request.
 * @returns The assembled context.
 * @throws {PurseError} `NOT_FOUND` when the agent is not in this organization,
 *   or `VALIDATION_FAILED` when the amount exceeds the asset's precision.
 */
export async function loadAuthorizationContext(
  db: Database,
  tx: Database | Transaction,
  orgId: string,
  request: PaymentRequest,
): Promise<AuthorizationContext> {
  const bundle = await getAgentBundle(db, orgId, request.agentId);
  if (bundle === null) {
    throw new PurseError('NOT_FOUND', 'Agent not found in this organization.', {
      agentId: request.agentId,
    });
  }

  const amount = parseAmount(request.amount, decimalsOf(request.asset));

  const taskBudget =
    request.taskBudgetId === undefined
      ? null
      : await getTaskBudget(tx, orgId, request.taskBudgetId);
  if (request.taskBudgetId !== undefined && taskBudget === null) {
    throw new PurseError('NOT_FOUND', 'Task budget not found.', {
      taskBudgetId: request.taskBudgetId,
    });
  }
  if (taskBudget !== null && taskBudget.agentId !== request.agentId) {
    throw new PurseError('FORBIDDEN', 'Task budget belongs to a different agent.', {
      taskBudgetId: taskBudget.id,
    });
  }

  const [spentToday, knownRecipients] = await Promise.all([
    sumSpendToday(tx, request.agentId, request.asset),
    listKnownRecipients(tx, request.agentId),
  ]);

  return {
    agent: bundle.agent,
    wallet: bundle.wallet,
    budget: bundle.budget,
    policy: toEvaluablePolicy(bundle.policy),
    taskBudget,
    spentToday,
    knownRecipients,
    amount,
  };
}

/**
 * Runs both decision engines over a loaded context.
 *
 * @param context - Facts loaded by {@link loadAuthorizationContext}.
 * @param request - The parsed payment request.
 * @returns The combined verdict, including headroom figures.
 */
export function decide(
  context: AuthorizationContext,
  request: PaymentRequest,
  usdCents?: bigint | null,
): AuthorizationDecision {
  return authorizePayment(
    {
      amount: context.amount,
      asset: request.asset,
      chain: request.chain,
      recipient: request.recipient,
      category: request.category,
      initiatedBy: request.initiatedBy,
      agentStatus: context.agent.status,
      policy: context.policy,
      knownRecipients: context.knownRecipients,
      usdCents: usdCents ?? null,
    },
    {
      amount: context.amount,
      asset: request.asset,
      budget: context.budget,
      spentToday: context.spentToday,
      taskBudget:
        context.taskBudget === null
          ? null
          : {
              id: context.taskBudget.id,
              asset: context.taskBudget.asset,
              limit: context.taskBudget.limit,
              spent: context.taskBudget.spent,
              closed: context.taskBudget.closedAt !== null,
            },
    },
  );
}

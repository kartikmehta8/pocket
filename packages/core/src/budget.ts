/**
 * The budget engine.
 *
 * Like the policy engine this is pure and deny-by-default: an agent with no
 * configured budget cannot spend. It answers two questions at once, "is this
 * payment within every envelope" and "how much is left afterwards", because
 * the preview endpoint and the execute endpoint both need the second answer.
 */

import { remaining } from './money.js';
import type { PolicyViolation } from './policy.js';

/** An agent's recurring envelope, with money already in base units. */
export interface EvaluableBudget {
  asset: string;
  dailyLimit: bigint;
  perTransactionLimit: bigint;
}

/** A task-scoped envelope, with money already in base units. */
export interface EvaluableTaskBudget {
  id: string;
  asset: string;
  limit: bigint;
  spent: bigint;
  closed: boolean;
}

/** Everything the engine needs to decide, with no I/O of its own. */
export interface BudgetInput {
  amount: bigint;
  asset: string;
  /** `null` means no budget is configured, which denies. */
  budget: EvaluableBudget | null;
  /** Settled and in-flight spend for the current UTC day, in base units. */
  spentToday: bigint;
  /** Present only when the request named a task budget. */
  taskBudget: EvaluableTaskBudget | null;
}

/** Remaining headroom after a hypothetical payment. */
export interface BudgetHeadroom {
  /** Daily allowance left before this payment. */
  dailyRemaining: bigint;
  /** Daily allowance left if this payment settles. */
  dailyRemainingAfter: bigint;
  /** Task allowance left before this payment, when a task budget applies. */
  taskRemaining: bigint | null;
  /** Task allowance left if this payment settles. */
  taskRemainingAfter: bigint | null;
}

/** Result of evaluating a payment against every applicable envelope. */
export interface BudgetDecision {
  allowed: boolean;
  violations: PolicyViolation[];
  headroom: BudgetHeadroom;
}

const NO_HEADROOM: BudgetHeadroom = {
  dailyRemaining: 0n,
  dailyRemainingAfter: 0n,
  taskRemaining: null,
  taskRemainingAfter: null,
};

/**
 * Evaluates a payment against the agent's daily, per-transaction and task
 * budgets.
 *
 * @param input - Parsed payment facts plus the agent's envelopes and spend.
 * @returns Every violation found plus the headroom figures a caller can show
 *   to an agent so it can pick a cheaper provider.
 * @remarks Never throws, for the same reason as the policy engine.
 */
export function evaluateBudget(input: BudgetInput): BudgetDecision {
  const violations: PolicyViolation[] = [];
  const { budget, taskBudget, amount } = input;

  if (budget === null) {
    return {
      allowed: false,
      violations: [
        { code: 'POLICY_VIOLATION', message: 'No budget is configured for this agent.' },
      ],
      headroom: NO_HEADROOM,
    };
  }

  if (budget.asset !== input.asset) {
    violations.push({
      code: 'ASSET_NOT_ALLOWED',
      message: `Budget is denominated in ${budget.asset}, not ${input.asset}.`,
      details: { budgetAsset: budget.asset, requestedAsset: input.asset },
    });
  }

  if (amount > budget.perTransactionLimit) {
    violations.push({
      code: 'PER_TX_LIMIT_EXCEEDED',
      message: 'Payment exceeds the per-transaction limit.',
      details: {
        amount: amount.toString(),
        perTransactionLimit: budget.perTransactionLimit.toString(),
      },
    });
  }

  if (input.spentToday + amount > budget.dailyLimit) {
    violations.push({
      code: 'DAILY_BUDGET_EXCEEDED',
      message: 'Payment would exceed the daily budget.',
      details: {
        amount: amount.toString(),
        spentToday: input.spentToday.toString(),
        dailyLimit: budget.dailyLimit.toString(),
      },
    });
  }

  let taskRemaining: bigint | null = null;
  let taskRemainingAfter: bigint | null = null;

  if (taskBudget !== null) {
    taskRemaining = remaining(taskBudget.limit, taskBudget.spent);
    taskRemainingAfter = remaining(taskBudget.limit, taskBudget.spent + amount);

    if (taskBudget.closed) {
      violations.push({
        code: 'CONFLICT',
        message: 'The referenced task budget is closed.',
        details: { taskBudgetId: taskBudget.id },
      });
    }
    if (taskBudget.asset !== input.asset) {
      violations.push({
        code: 'ASSET_NOT_ALLOWED',
        message: `Task budget is denominated in ${taskBudget.asset}, not ${input.asset}.`,
        details: { taskBudgetAsset: taskBudget.asset, requestedAsset: input.asset },
      });
    }
    if (taskBudget.spent + amount > taskBudget.limit) {
      violations.push({
        code: 'TASK_BUDGET_EXCEEDED',
        message: 'Payment would exceed the task budget.',
        details: {
          amount: amount.toString(),
          taskSpent: taskBudget.spent.toString(),
          taskLimit: taskBudget.limit.toString(),
        },
      });
    }
  }

  return {
    allowed: violations.length === 0,
    violations,
    headroom: {
      dailyRemaining: remaining(budget.dailyLimit, input.spentToday),
      dailyRemainingAfter: remaining(budget.dailyLimit, input.spentToday + amount),
      taskRemaining,
      taskRemainingAfter,
    },
  };
}

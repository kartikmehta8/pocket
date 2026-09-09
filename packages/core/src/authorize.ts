/**
 * Composition of the policy and budget engines into one verdict.
 *
 * Both engines always run, even when the first has already denied, so an agent
 * receives every reason at once instead of discovering them one retry at a
 * time.
 */

import { evaluateBudget, type BudgetDecision, type BudgetInput } from './budget.js';
import { evaluatePolicy, type PolicyDecision, type PolicyInput } from './policy.js';
import type { PolicyViolation, PolicyOutcome } from './policy.js';
import type { BudgetHeadroom } from './budget.js';

/** The combined verdict returned by preview and consumed by execute. */
export interface AuthorizationDecision {
  outcome: PolicyOutcome;
  violations: PolicyViolation[];
  approvalReasons: string[];
  headroom: BudgetHeadroom;
  /** The first violation's code, convenient for a single-reason UI. */
  primaryDenialCode: string | null;
}

/**
 * Runs both engines and reduces them to a single outcome.
 *
 * @param policyInput - Facts and policy for {@link evaluatePolicy}.
 * @param budgetInput - Facts and envelopes for {@link evaluateBudget}.
 * @returns A deny if either engine denied, otherwise an approval requirement
 *   if policy asked for one, otherwise an allow.
 */
export function authorizePayment(
  policyInput: PolicyInput,
  budgetInput: BudgetInput,
): AuthorizationDecision {
  const policy: PolicyDecision = evaluatePolicy(policyInput);
  const budget: BudgetDecision = evaluateBudget(budgetInput);

  const violations = [...policy.violations, ...budget.violations];
  const outcome: PolicyOutcome =
    violations.length > 0
      ? 'deny'
      : policy.outcome === 'require_approval'
        ? 'require_approval'
        : 'allow';

  return {
    outcome,
    violations,
    approvalReasons: policy.approvalReasons,
    headroom: budget.headroom,
    primaryDenialCode: violations[0]?.code ?? null,
  };
}

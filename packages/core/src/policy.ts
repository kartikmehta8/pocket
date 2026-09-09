/**
 * The policy engine.
 *
 * A pure, synchronous function over already-parsed values. It performs no I/O
 * so it can be exhaustively tested, and it is deny-by-default: a missing
 * policy, an unrecognised value, or an unmet condition blocks the payment.
 */

import type { ErrorCode } from './errors.js';
import type { AgentStatus, Initiator, PaymentCategory } from './types.js';
import type { AssetId, ChainId } from './assets.js';

/** A single reason a payment was blocked or escalated. */
export interface PolicyViolation {
  /** Stable code the caller can branch on. */
  code: ErrorCode;
  /** Client-safe explanation. */
  message: string;
  /** Client-safe structured context. */
  details?: Record<string, string>;
}

/** Terminal verdict of the policy engine. */
export type PolicyOutcome = 'allow' | 'require_approval' | 'deny';

/** Result of evaluating a payment against a policy. */
export interface PolicyDecision {
  outcome: PolicyOutcome;
  /** Non-empty when the outcome is `deny`. */
  violations: PolicyViolation[];
  /** Non-empty when the outcome is `require_approval`. */
  approvalReasons: string[];
}

/** Policy configuration with money fields already parsed to base units. */
export interface EvaluablePolicy {
  allowedAssets: readonly AssetId[];
  allowedChains: readonly ChainId[];
  allowedCategories: readonly PaymentCategory[];
  maxTransactionAmount: bigint;
  /** Lower-cased addresses. */
  trustedRecipients: readonly string[];
  unknownRecipientBehaviour: 'block' | 'require_approval' | 'allow';
  /** Payments at or above this amount need a human. Absent disables the rule. */
  approvalThreshold?: bigint;
  /**
   * Ceiling on the payment's value in USD cents. Absent disables the rule.
   *
   * @remarks A limit denominated in tokens is not a limit on value. An agent
   * allowed "2 HBAR" per payment is allowed an unbounded amount of money if
   * HBAR moves. This rule bounds the money.
   */
  maxUsdCentsPerTransaction?: bigint;
}

/** Everything the engine needs to decide, with no I/O of its own. */
export interface PolicyInput {
  amount: bigint;
  asset: AssetId;
  chain: ChainId;
  /** Recipient address, any case. */
  recipient: string;
  category: PaymentCategory;
  initiatedBy: Initiator;
  agentStatus: AgentStatus;
  /** `null` means no policy is configured, which denies. */
  policy: EvaluablePolicy | null;
  /** Lower-cased addresses this agent has successfully paid before. */
  knownRecipients: ReadonlySet<string>;
  /**
   * The payment's value in USD cents, or `null` when it could not be priced.
   *
   * @remarks Only consulted when the policy sets a USD ceiling. `null` then
   * denies: an unverifiable value is not a safe value, and failing open here
   * would make the ceiling advisory.
   */
  usdCents?: bigint | null;
}

/**
 * Evaluates a payment against an agent's policy.
 *
 * @param input - Parsed payment facts plus the agent's policy and history.
 * @returns A decision carrying every violation found, not just the first, so
 *   an agent can correct all problems in one round trip.
 * @remarks Deny-by-default. A `null` policy always denies. This function never
 *   throws; a thrown error would otherwise have to be interpreted as "allow"
 *   by a careless caller.
 */
export function evaluatePolicy(input: PolicyInput): PolicyDecision {
  const violations: PolicyViolation[] = [];
  const approvalReasons: string[] = [];

  if (input.amount <= 0n) {
    violations.push({
      code: 'VALIDATION_FAILED',
      message: 'Payment amount must be greater than zero.',
    });
  }

  if (input.agentStatus !== 'active') {
    violations.push({
      code: 'AGENT_INACTIVE',
      message: `Agent is ${input.agentStatus} and may not spend.`,
      details: { status: input.agentStatus },
    });
  }

  const { policy } = input;
  if (policy === null) {
    violations.push({
      code: 'POLICY_VIOLATION',
      message: 'No spending policy is configured for this agent.',
    });
    return { outcome: 'deny', violations, approvalReasons };
  }

  if (!policy.allowedAssets.includes(input.asset)) {
    violations.push({
      code: 'ASSET_NOT_ALLOWED',
      message: `Asset ${input.asset} is not permitted by policy.`,
      details: { asset: input.asset, allowed: policy.allowedAssets.join(',') },
    });
  }

  if (!policy.allowedChains.includes(input.chain)) {
    violations.push({
      code: 'CHAIN_NOT_ALLOWED',
      message: `Chain ${input.chain} is not permitted by policy.`,
      details: { chain: input.chain, allowed: policy.allowedChains.join(',') },
    });
  }

  if (!policy.allowedCategories.includes(input.category)) {
    violations.push({
      code: 'CATEGORY_NOT_ALLOWED',
      message: `Category ${input.category} is not permitted by policy.`,
      details: { category: input.category, allowed: policy.allowedCategories.join(',') },
    });
  }

  if (input.amount > policy.maxTransactionAmount) {
    violations.push({
      code: 'PER_TX_LIMIT_EXCEEDED',
      message: 'Payment exceeds the policy maximum for a single transaction.',
      details: {
        amount: input.amount.toString(),
        maxTransactionAmount: policy.maxTransactionAmount.toString(),
      },
    });
  }

  const recipient = input.recipient.toLowerCase();
  const trusted = policy.trustedRecipients.includes(recipient);
  const known = input.knownRecipients.has(recipient);

  if (!trusted && !known) {
    if (policy.unknownRecipientBehaviour === 'block') {
      violations.push({
        code: 'RECIPIENT_NOT_TRUSTED',
        message: 'Recipient is not on the trusted list and has never been paid before.',
        details: { recipient },
      });
    } else if (policy.unknownRecipientBehaviour === 'require_approval') {
      approvalReasons.push(`Recipient ${recipient} has never been paid by this agent.`);
    }
  }

  if (policy.maxUsdCentsPerTransaction !== undefined) {
    const usdCents = input.usdCents ?? null;
    if (usdCents === null) {
      violations.push({
        code: 'POLICY_VIOLATION',
        message: 'Policy sets a USD ceiling but the payment could not be priced.',
      });
    } else if (usdCents > policy.maxUsdCentsPerTransaction) {
      violations.push({
        code: 'PER_TX_LIMIT_EXCEEDED',
        message: 'Payment exceeds the policy maximum value in USD.',
        details: {
          usdCents: usdCents.toString(),
          maxUsdCentsPerTransaction: policy.maxUsdCentsPerTransaction.toString(),
        },
      });
    }
  }

  if (policy.approvalThreshold !== undefined && input.amount >= policy.approvalThreshold) {
    approvalReasons.push('Payment is at or above the human approval threshold.');
  }

  if (violations.length > 0) return { outcome: 'deny', violations, approvalReasons };
  if (approvalReasons.length > 0)
    return { outcome: 'require_approval', violations, approvalReasons };
  return { outcome: 'allow', violations, approvalReasons };
}

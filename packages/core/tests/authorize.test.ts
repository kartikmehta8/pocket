import { describe, expect, it } from 'vitest';
import { authorizePayment } from '../src/authorize.js';
import type { PolicyInput, EvaluablePolicy } from '../src/policy.js';
import type { BudgetInput } from '../src/budget.js';

const RECIPIENT = '0x1111111111111111111111111111111111111111';

const policy: EvaluablePolicy = {
  allowedAssets: ['USDC'],
  allowedChains: ['hedera-testnet'],
  allowedCategories: ['research'],
  maxTransactionAmount: 2_000_000n,
  trustedRecipients: [RECIPIENT],
  unknownRecipientBehaviour: 'require_approval',
  approvalThreshold: 1_000_000n,
};

const policyInput = (o: Partial<PolicyInput> = {}): PolicyInput => ({
  amount: 80_000n,
  asset: 'USDC',
  chain: 'hedera-testnet',
  recipient: RECIPIENT,
  category: 'research',
  initiatedBy: 'agent',
  agentStatus: 'active',
  policy,
  knownRecipients: new Set<string>(),
  ...o,
});

const budgetInput = (o: Partial<BudgetInput> = {}): BudgetInput => ({
  amount: 80_000n,
  asset: 'USDC',
  budget: { asset: 'USDC', dailyLimit: 20_000_000n, perTransactionLimit: 2_000_000n },
  spentToday: 0n,
  taskBudget: null,
  ...o,
});

describe('authorizePayment', () => {
  it('allows when both engines allow', () => {
    const decision = authorizePayment(policyInput(), budgetInput());
    expect(decision.outcome).toBe('allow');
    expect(decision.primaryDenialCode).toBeNull();
  });

  it('denies when only the budget engine objects', () => {
    const decision = authorizePayment(policyInput(), budgetInput({ spentToday: 20_000_000n }));
    expect(decision.outcome).toBe('deny');
    expect(decision.primaryDenialCode).toBe('DAILY_BUDGET_EXCEEDED');
  });

  it('denies when only the policy engine objects', () => {
    const decision = authorizePayment(policyInput({ category: 'compute' }), budgetInput());
    expect(decision.outcome).toBe('deny');
    expect(decision.primaryDenialCode).toBe('CATEGORY_NOT_ALLOWED');
  });

  it('lets a budget denial override a policy approval requirement', () => {
    const decision = authorizePayment(
      policyInput({ amount: 1_500_000n }),
      budgetInput({ amount: 1_500_000n, spentToday: 19_000_000n }),
    );
    expect(decision.outcome).toBe('deny');
  });

  it('escalates when policy asks for approval and the budget is fine', () => {
    const decision = authorizePayment(
      policyInput({ amount: 1_500_000n }),
      budgetInput({ amount: 1_500_000n }),
    );
    expect(decision.outcome).toBe('require_approval');
    expect(decision.approvalReasons.length).toBeGreaterThan(0);
  });

  it('still reports headroom on a denial so an agent can pick a cheaper option', () => {
    const decision = authorizePayment(
      policyInput({ amount: 5_000_000n }),
      budgetInput({ amount: 5_000_000n }),
    );
    expect(decision.outcome).toBe('deny');
    expect(decision.headroom.dailyRemaining).toBe(20_000_000n);
  });
});

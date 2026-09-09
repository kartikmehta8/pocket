import { describe, expect, it } from 'vitest';
import { evaluateBudget, type BudgetInput, type EvaluableBudget } from '../src/budget.js';

const budget: EvaluableBudget = {
  asset: 'USDC',
  dailyLimit: 20_000_000n,
  perTransactionLimit: 2_000_000n,
};

function input(overrides: Partial<BudgetInput> = {}): BudgetInput {
  return { amount: 80_000n, asset: 'USDC', budget, spentToday: 0n, taskBudget: null, ...overrides };
}

const codes = (i: BudgetInput): string[] => evaluateBudget(i).violations.map((v) => v.code);

describe('evaluateBudget', () => {
  it('allows a payment inside every envelope', () => {
    expect(evaluateBudget(input()).allowed).toBe(true);
  });

  it('denies when no budget is configured', () => {
    const decision = evaluateBudget(input({ budget: null }));
    expect(decision.allowed).toBe(false);
    expect(decision.violations[0]?.code).toBe('POLICY_VIOLATION');
  });

  it('denies an asset the budget is not denominated in', () => {
    expect(codes(input({ asset: 'HBAR' }))).toContain('ASSET_NOT_ALLOWED');
  });

  it('denies at the per-transaction boundary', () => {
    expect(evaluateBudget(input({ amount: 2_000_000n })).allowed).toBe(true);
    expect(codes(input({ amount: 2_000_001n }))).toContain('PER_TX_LIMIT_EXCEEDED');
  });

  it('denies when the payment would cross the daily limit', () => {
    expect(evaluateBudget(input({ amount: 1_000_000n, spentToday: 19_000_000n })).allowed).toBe(
      true,
    );
    expect(codes(input({ amount: 1_000_001n, spentToday: 19_000_000n }))).toContain(
      'DAILY_BUDGET_EXCEEDED',
    );
  });

  it('reports daily headroom before and after the payment', () => {
    const { headroom } = evaluateBudget(input({ amount: 500_000n, spentToday: 1_000_000n }));
    expect(headroom.dailyRemaining).toBe(19_000_000n);
    expect(headroom.dailyRemainingAfter).toBe(18_500_000n);
    expect(headroom.taskRemaining).toBeNull();
  });

  it('clamps headroom at zero when already overspent', () => {
    const { headroom } = evaluateBudget(input({ spentToday: 25_000_000n }));
    expect(headroom.dailyRemaining).toBe(0n);
    expect(headroom.dailyRemainingAfter).toBe(0n);
  });

  describe('task budgets', () => {
    const task = {
      id: 'task_1',
      asset: 'USDC',
      limit: 500_000n,
      spent: 80_000n,
      closed: false,
    };

    it('allows a payment inside the task envelope and reports headroom', () => {
      const decision = evaluateBudget(input({ amount: 80_000n, taskBudget: task }));
      expect(decision.allowed).toBe(true);
      expect(decision.headroom.taskRemaining).toBe(420_000n);
      expect(decision.headroom.taskRemainingAfter).toBe(340_000n);
    });

    it('denies a payment that would exceed the task budget', () => {
      // The plan's demo: 0.75 requested against 0.42 remaining.
      const decision = evaluateBudget(input({ amount: 750_000n, taskBudget: task }));
      expect(decision.allowed).toBe(false);
      expect(decision.violations.map((v) => v.code)).toContain('TASK_BUDGET_EXCEEDED');
      expect(decision.headroom.taskRemaining).toBe(420_000n);
    });

    it('denies a closed task budget', () => {
      expect(codes(input({ taskBudget: { ...task, closed: true } }))).toContain('CONFLICT');
    });

    it('denies a task budget in a different asset', () => {
      expect(codes(input({ taskBudget: { ...task, asset: 'HBAR' } }))).toContain(
        'ASSET_NOT_ALLOWED',
      );
    });

    it('applies the daily limit even when the task budget has room', () => {
      const decision = evaluateBudget(
        input({ amount: 400_000n, spentToday: 19_900_000n, taskBudget: task }),
      );
      expect(decision.allowed).toBe(false);
      expect(decision.violations.map((v) => v.code)).toContain('DAILY_BUDGET_EXCEEDED');
    });
  });
});

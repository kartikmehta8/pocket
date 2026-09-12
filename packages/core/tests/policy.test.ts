/**
 * What an agent may buy, and from whom.
 */

import { describe, expect, it } from 'vitest';
import { evaluatePolicy, type EvaluablePolicy, type PolicyInput } from '../src/policy.js';

const TRUSTED = '0x1111111111111111111111111111111111111111';
const STRANGER = '0x2222222222222222222222222222222222222222';

const basePolicy: EvaluablePolicy = {
  allowedAssets: ['USDC'],
  allowedChains: ['hedera-testnet'],
  allowedCategories: ['research', 'data'],
  maxTransactionAmount: 2_000_000n,
  trustedRecipients: [TRUSTED],
  unknownRecipientBehaviour: 'block',
};

function input(overrides: Partial<PolicyInput> = {}): PolicyInput {
  return {
    amount: 80_000n,
    asset: 'USDC',
    chain: 'hedera-testnet',
    recipient: TRUSTED,
    category: 'research',
    initiatedBy: 'agent',
    agentStatus: 'active',
    policy: basePolicy,
    knownRecipients: new Set<string>(),
    ...overrides,
  };
}

const codes = (i: PolicyInput): string[] => evaluatePolicy(i).violations.map((v) => v.code);

describe('evaluatePolicy', () => {
  it('allows a compliant payment to a trusted recipient', () => {
    expect(evaluatePolicy(input()).outcome).toBe('allow');
  });

  it('denies when no policy is configured', () => {
    const decision = evaluatePolicy(input({ policy: null }));
    expect(decision.outcome).toBe('deny');
    expect(decision.violations[0]?.code).toBe('POLICY_VIOLATION');
  });

  it('denies a non-active agent', () => {
    expect(codes(input({ agentStatus: 'paused' }))).toContain('AGENT_INACTIVE');
    expect(codes(input({ agentStatus: 'revoked' }))).toContain('AGENT_INACTIVE');
  });

  it('denies a zero or negative amount', () => {
    expect(codes(input({ amount: 0n }))).toContain('VALIDATION_FAILED');
    expect(codes(input({ amount: -1n }))).toContain('VALIDATION_FAILED');
  });

  it('denies assets, chains and categories outside the allowlist', () => {
    expect(codes(input({ asset: 'HBAR' }))).toContain('ASSET_NOT_ALLOWED');
    expect(codes(input({ chain: 'hedera-mainnet' }))).toContain('CHAIN_NOT_ALLOWED');
    expect(codes(input({ category: 'compute' }))).toContain('CATEGORY_NOT_ALLOWED');
  });

  it('denies at the per-transaction ceiling boundary', () => {
    expect(evaluatePolicy(input({ amount: 2_000_000n })).outcome).toBe('allow');
    expect(codes(input({ amount: 2_000_001n }))).toContain('PER_TX_LIMIT_EXCEEDED');
  });

  it('reports every violation at once rather than only the first', () => {
    const found = codes(input({ asset: 'HBAR', chain: 'hedera-mainnet', category: 'compute' }));
    expect(found).toEqual(
      expect.arrayContaining(['ASSET_NOT_ALLOWED', 'CHAIN_NOT_ALLOWED', 'CATEGORY_NOT_ALLOWED']),
    );
  });

  describe('unknown recipients', () => {
    it('blocks a stranger when the behaviour is block', () => {
      expect(codes(input({ recipient: STRANGER }))).toContain('RECIPIENT_NOT_TRUSTED');
    });

    it('escalates a stranger when the behaviour is require_approval', () => {
      const decision = evaluatePolicy(
        input({
          recipient: STRANGER,
          policy: { ...basePolicy, unknownRecipientBehaviour: 'require_approval' },
        }),
      );
      expect(decision.outcome).toBe('require_approval');
      expect(decision.approvalReasons).toHaveLength(1);
    });

    it('allows a stranger when the behaviour is allow', () => {
      const decision = evaluatePolicy(
        input({
          recipient: STRANGER,
          policy: { ...basePolicy, unknownRecipientBehaviour: 'allow' },
        }),
      );
      expect(decision.outcome).toBe('allow');
    });

    it('treats a previously paid recipient as known', () => {
      const decision = evaluatePolicy(
        input({ recipient: STRANGER, knownRecipients: new Set([STRANGER]) }),
      );
      expect(decision.outcome).toBe('allow');
    });

    it('compares recipients case-insensitively', () => {
      const decision = evaluatePolicy(
        input({ recipient: TRUSTED.toUpperCase().replace('0X', '0x') }),
      );
      expect(decision.outcome).toBe('allow');
    });
  });

  describe('approval threshold', () => {
    const withThreshold: EvaluablePolicy = { ...basePolicy, approvalThreshold: 1_000_000n };

    it('escalates at or above the threshold', () => {
      expect(evaluatePolicy(input({ amount: 1_000_000n, policy: withThreshold })).outcome).toBe(
        'require_approval',
      );
      expect(evaluatePolicy(input({ amount: 1_500_000n, policy: withThreshold })).outcome).toBe(
        'require_approval',
      );
    });

    it('allows below the threshold', () => {
      expect(evaluatePolicy(input({ amount: 999_999n, policy: withThreshold })).outcome).toBe(
        'allow',
      );
    });

    it('lets a hard violation win over an escalation', () => {
      const decision = evaluatePolicy(
        input({ amount: 5_000_000n, policy: withThreshold, category: 'compute' }),
      );
      expect(decision.outcome).toBe('deny');
    });
  });
});

describe('USD ceiling', () => {
  const priced: EvaluablePolicy = { ...basePolicy, maxUsdCentsPerTransaction: 500n };

  it('allows a payment worth less than the ceiling', () => {
    expect(evaluatePolicy(input({ policy: priced, usdCents: 499n })).outcome).toBe('allow');
  });

  it('allows exactly at the ceiling', () => {
    expect(evaluatePolicy(input({ policy: priced, usdCents: 500n })).outcome).toBe('allow');
  });

  it('denies a payment worth more than the ceiling', () => {
    const decision = evaluatePolicy(input({ policy: priced, usdCents: 501n }));
    expect(decision.outcome).toBe('deny');
    expect(decision.violations.map((v) => v.code)).toContain('PER_TX_LIMIT_EXCEEDED');
  });

  it('denies when the payment cannot be priced, rather than failing open', () => {
    for (const usdCents of [null, undefined]) {
      const decision = evaluatePolicy(input({ policy: priced, usdCents }));
      expect(decision.outcome, String(usdCents)).toBe('deny');
      expect(decision.violations.map((v) => v.code)).toContain('POLICY_VIOLATION');
    }
  });

  it('ignores pricing entirely when no ceiling is set', () => {
    expect(evaluatePolicy(input({ usdCents: null })).outcome).toBe('allow');
    expect(evaluatePolicy(input({ usdCents: 10_000_000n })).outcome).toBe('allow');
  });

  it('denies 2 tokens inside the token ceiling once they are worth $80', () => {
    const decision = evaluatePolicy(
      input({ amount: 2_000_000n, policy: priced, usdCents: 8_000n }),
    );
    expect(decision.outcome).toBe('deny');
  });
});

/**
 * The second ceiling, held by the custodian.
 *
 * Pocket's own engine decides every payment, and this is what stands underneath
 * it: a policy Privy enforces on the wallet itself, so a bug in Pocket cannot
 * on its own authorise an unbounded transfer. Two independent things have to
 * fail before money moves incorrectly.
 *
 * Money reaches Privy as decimal wei. Hex is rejected, which is the kind of
 * thing that fails at wallet-creation time on a Friday.
 */

import { describe, expect, it, vi } from 'vitest';
import type { PrivyClient } from '@privy-io/server-auth';

import { createWalletPolicy, walletPolicyRules } from './privy-policy.js';

describe('walletPolicyRules', () => {
  const rules = walletPolicyRules({ ceilingWei: 2_000_000_000_000_000_000n });

  it('allows wallet operations and denies transfers over the ceiling', () => {
    expect(rules.map((rule) => rule.action)).toEqual(['ALLOW', 'DENY', 'DENY']);
    expect(rules[1]?.method).toBe('eth_sendTransaction');
  });

  it('switches off key export, which is what makes the custody claim true', () => {
    const exportRule = rules.find((rule) => rule.method === 'exportPrivateKey');

    expect(exportRule?.action).toBe('DENY');
    expect(exportRule?.conditions).toEqual([]);
  });

  it('states the ceiling as decimal wei, because hex is rejected', () => {
    const value = rules[1]?.conditions[0]?.value;

    expect(value).toBe('2000000000000000000');
    expect(value).not.toMatch(/^0x/);
  });

  it('bounds the value a transaction carries, not the gas it spends', () => {
    expect(rules[1]?.conditions[0]).toMatchObject({
      fieldSource: 'ethereum_transaction',
      field: 'value',
      operator: 'gt',
    });
  });
});

describe('createWalletPolicy', () => {
  it('returns the id Privy minted', async () => {
    const privy = {
      walletApi: { createPolicy: vi.fn().mockResolvedValue({ id: 'policy_1' }) },
    } as unknown as PrivyClient;

    await expect(createWalletPolicy(privy, { ceilingWei: 1n })).resolves.toBe('policy_1');
  });

  it('does not block wallet creation when Privy refuses', async () => {
    const warn = vi.spyOn(process, 'emitWarning').mockImplementation(() => undefined);
    const privy = {
      walletApi: { createPolicy: vi.fn().mockRejectedValue(new Error('rate limited')) },
    } as unknown as PrivyClient;

    await expect(createWalletPolicy(privy, { ceilingWei: 1n })).resolves.toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

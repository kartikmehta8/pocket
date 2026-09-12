/**
 * What the API accepts, and what it refuses at the edge.
 *
 * These schemas are the outermost boundary. Everything past them is trusted, so
 * a value that gets through wrong is a value the engine will act on: an address
 * with the wrong shape is a payment to nowhere, and an amount carrying an
 * exponent or a sign is an amount no ledger can represent.
 *
 * The policy document has a rule of its own worth pinning: it must be accepted
 * in exactly the shape the API hands it out, nulls included, or reading a
 * policy and saving it unchanged would fail.
 */

import { describe, expect, it } from 'vitest';

import {
  addressSchema,
  amountSchema,
  createAgentSchema,
  createOrgSchema,
  paymentRequestSchema,
  setBudgetSchema,
  setPolicySchema,
  transferAgentFundsSchema,
} from '../src/schemas.js';

const ADDRESS = '0x1f9D1adc7C5121C419883fef05000B1003B4e182';

describe('addressSchema', () => {
  it('accepts a 20-byte address in either case', () => {
    expect(addressSchema.safeParse(ADDRESS).success).toBe(true);
    expect(addressSchema.safeParse(ADDRESS.toLowerCase()).success).toBe(true);
  });

  it('refuses anything that is not one', () => {
    for (const bad of [
      '',
      '0x',
      ADDRESS.slice(0, -1),
      `${ADDRESS}00`,
      ADDRESS.slice(2),
      '0.0.123',
    ]) {
      expect(addressSchema.safeParse(bad).success, bad).toBe(false);
    }
  });
});

describe('amountSchema', () => {
  it('accepts an unsigned decimal string', () => {
    for (const good of ['0', '0.01', '1', '1000000.123456']) {
      expect(amountSchema.safeParse(good).success, good).toBe(true);
    }
  });

  it('refuses everything a ledger cannot represent', () => {
    for (const bad of ['-1', '1e6', '1.', '.1', '', ' 1', '1,5', 'NaN', 'Infinity']) {
      expect(amountSchema.safeParse(bad).success, bad).toBe(false);
    }
  });

  it('refuses a number, because a float is not an amount', () => {
    expect(amountSchema.safeParse(0.01).success).toBe(false);
  });
});

describe('createOrgSchema', () => {
  it('needs a name, and not an endless one', () => {
    expect(createOrgSchema.safeParse({ name: 'Acme' }).success).toBe(true);
    expect(createOrgSchema.safeParse({ name: '' }).success).toBe(false);
    expect(createOrgSchema.safeParse({ name: 'x'.repeat(121) }).success).toBe(false);
  });
});

describe('createAgentSchema', () => {
  it('needs only a name', () => {
    expect(createAgentSchema.safeParse({ name: 'Atlas' }).success).toBe(true);
  });

  it('takes a description and string metadata', () => {
    const parsed = createAgentSchema.safeParse({
      name: 'Atlas',
      description: 'Buys market data.',
      metadata: { team: 'research' },
    });
    expect(parsed.success).toBe(true);
  });

  it('refuses metadata that is not strings, which would not survive a round trip', () => {
    expect(createAgentSchema.safeParse({ name: 'Atlas', metadata: { n: 1 } }).success).toBe(false);
  });
});

describe('transferAgentFundsSchema', () => {
  it('names a destination and nothing about how much', () => {
    const parsed = transferAgentFundsSchema.safeParse({ toAgentId: 'agent_1', amount: '1' });
    expect(parsed.success).toBe(true);
    expect(parsed.success && 'amount' in parsed.data).toBe(false);
  });

  it('refuses a transfer with nowhere to go', () => {
    expect(transferAgentFundsSchema.safeParse({}).success).toBe(false);
  });
});

describe('setBudgetSchema', () => {
  it('needs both ceilings and the asset they are in', () => {
    expect(
      setBudgetSchema.safeParse({ asset: 'USDC', dailyLimit: '20', perTransactionLimit: '2' })
        .success,
    ).toBe(true);
    expect(setBudgetSchema.safeParse({ asset: 'USDC', dailyLimit: '20' }).success).toBe(false);
    expect(
      setBudgetSchema.safeParse({ asset: 'ETH', dailyLimit: '20', perTransactionLimit: '2' })
        .success,
    ).toBe(false);
  });
});

describe('setPolicySchema', () => {
  const policy = {
    allowedAssets: ['USDC'],
    allowedChains: ['hedera-testnet'],
    allowedCategories: ['data'],
    maxTransactionAmount: '2',
    trustedRecipients: [ADDRESS],
    unknownRecipientBehaviour: 'block',
  };

  it('accepts a whole document', () => {
    expect(setPolicySchema.safeParse(policy).success).toBe(true);
  });

  it('defaults the trusted list rather than demanding one', () => {
    const { trustedRecipients: _omitted, ...without } = policy;
    const parsed = setPolicySchema.safeParse(without);
    expect(parsed.success && parsed.data.trustedRecipients).toEqual([]);
  });

  it('takes a document back in the shape the API hands it out, nulls and all', () => {
    const served = { ...policy, approvalThreshold: null, maxUsdPerTransaction: null };
    expect(setPolicySchema.safeParse(served).success).toBe(true);
  });

  it('refuses a policy that allows nothing, which would be a silent deny-all', () => {
    expect(setPolicySchema.safeParse({ ...policy, allowedAssets: [] }).success).toBe(false);
    expect(setPolicySchema.safeParse({ ...policy, allowedCategories: [] }).success).toBe(false);
  });

  it('refuses a trusted recipient that is not an address', () => {
    expect(setPolicySchema.safeParse({ ...policy, trustedRecipients: ['0.0.123'] }).success).toBe(
      false,
    );
  });
});

describe('paymentRequestSchema', () => {
  const request = {
    agentId: 'agent_1',
    amount: '0.08',
    asset: 'USDC',
    chain: 'hedera-testnet',
    recipient: ADDRESS,
    category: 'data',
    reason: 'Prices for the portfolio view',
  };

  it('assumes an agent asked when nobody says otherwise', () => {
    const parsed = paymentRequestSchema.safeParse(request);
    expect(parsed.success && parsed.data.initiatedBy).toBe('agent');
  });

  it('records a person when one is named', () => {
    const parsed = paymentRequestSchema.safeParse({ ...request, initiatedBy: 'human' });
    expect(parsed.success && parsed.data.initiatedBy).toBe('human');
  });

  it('insists on a reason, which is what the audit trail reads back', () => {
    expect(paymentRequestSchema.safeParse({ ...request, reason: '' }).success).toBe(false);
  });

  it('refuses a chain Pocket does not settle on', () => {
    expect(paymentRequestSchema.safeParse({ ...request, chain: 'ethereum' }).success).toBe(false);
  });
});

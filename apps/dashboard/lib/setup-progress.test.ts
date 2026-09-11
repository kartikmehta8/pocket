import { describe, expect, it } from 'vitest';

import { DERIVED_STEPS, newestFirst, reachedSteps } from './setup-progress';
import type { ApiKey } from './types-account';
import type { AgentDetail, AgentSummary } from './types';

/** Fixed instants, so nothing here depends on when the suite runs. */
const REGISTERED = '2026-09-10T12:00:00.000Z';
const BEFORE = '2026-09-10T11:00:00.000Z';
const AFTER = '2026-09-10T13:00:00.000Z';

/** The agent the guide is following. */
function agentFixture(id = 'agent_1', createdAt = REGISTERED): AgentSummary {
  return {
    id,
    name: 'Hermes',
    description: null,
    status: 'active',
    createdAt,
    wallet: { address: '0xabc', chain: 'hedera-testnet' },
    budget: null,
    spend: { today: '0', dailyRemaining: '0', paymentCount: 0 },
  };
}

/** An unrevoked API key, with only the field the guide reads. */
function keyFixture(createdAt = AFTER): ApiKey {
  return { id: 'key_1', label: 'MCP server', prefix: 'pocket_sk_0000', createdAt, revokedAt: null };
}

/**
 * Agent detail carrying a balance, a budget and a policy.
 *
 * @remarks Fully typed on purpose. A cast here would let the suite assert
 * against a shape the API never returns, and no later change to
 * {@link AgentDetail} would ever break it.
 */
function detailFixture(): AgentDetail {
  return {
    agent: {
      ...agentFixture(),
      budget: { asset: 'USDC', dailyLimit: '5.00', perTransactionLimit: '1.00' },
    },
    balance: { asset: 'USDC', amount: '20.00' },
    policy: {
      allowedAssets: ['USDC'],
      allowedChains: ['hedera-testnet'],
      allowedCategories: ['data'],
      maxTransactionAmount: '1.00',
      trustedRecipients: [],
      unknownRecipientBehaviour: 'allow',
      approvalThreshold: null,
    },
    taskBudgets: [],
    accountId: '0.0.1',
    accountHollow: false,
  };
}

/** A run with all five recorded steps behind it. */
function complete() {
  return {
    agent: agentFixture(),
    detail: detailFixture(),
    keys: [keyFixture()],
    keysAvailable: true,
  };
}

describe('reachedSteps', () => {
  it('answers only for the steps that leave a record', () => {
    // The last two happen in a terminal and are confirmed by the operator, so
    // this module must not pretend to know about them.
    expect(reachedSteps(complete())).toHaveLength(DERIVED_STEPS);
  });

  it('reports nothing done for an empty organization', () => {
    const steps = reachedSteps({ agent: null, detail: null, keys: [], keysAvailable: true });
    expect(steps).toEqual([false, false, false, false, false]);
  });

  it('ignores keys entirely when there is no agent', () => {
    const steps = reachedSteps({
      agent: null,
      detail: null,
      keys: [keyFixture(BEFORE)],
      keysAvailable: true,
    });
    expect(steps.some(Boolean)).toBe(false);
  });

  it('reports a fully configured agent', () => {
    expect(reachedSteps(complete())).toEqual([true, true, true, true, true]);
  });

  it('ticks step one on registration alone', () => {
    const steps = reachedSteps({
      agent: agentFixture(),
      detail: null,
      keys: [],
      keysAvailable: true,
    });
    expect(steps[0]).toBe(true);
    expect(steps.slice(1).some(Boolean)).toBe(false);
  });

  describe('scoping to the agent being followed', () => {
    it('ignores a key minted before this agent was registered', () => {
      expect(reachedSteps({ ...complete(), keys: [keyFixture(BEFORE)] })[4]).toBe(false);
    });

    it('ticks the key once one is minted for this agent', () => {
      const steps = reachedSteps({ ...complete(), keys: [keyFixture(BEFORE), keyFixture(AFTER)] });
      expect(steps[4]).toBe(true);
    });

    it('counts a key created on the instant of registration', () => {
      expect(reachedSteps({ ...complete(), keys: [keyFixture(REGISTERED)] })[4]).toBe(true);
    });
  });

  describe('unreadable dates', () => {
    it('drops a key whose own date cannot be read', () => {
      expect(reachedSteps({ ...complete(), keys: [keyFixture('not a date')] })[4]).toBe(false);
    });

    it('still counts a run whose agent has an unreadable registration date', () => {
      // Otherwise every comparison against NaN is false and the guide freezes
      // at "1 of 7" with nothing on screen to explain why.
      const steps = reachedSteps({ ...complete(), agent: agentFixture('agent_1', 'not a date') });
      expect(steps).toEqual([true, true, true, true, true]);
    });
  });

  describe('when key management is unreachable', () => {
    it('counts the key step as behind a machine principal', () => {
      // The API refuses the key list for an API-key caller, so nothing the
      // operator does on this page can ever satisfy step five.
      const steps = reachedSteps({ ...complete(), keys: [], keysAvailable: false });
      expect(steps[4]).toBe(true);
    });

    it('still requires a key when the list is readable', () => {
      expect(reachedSteps({ ...complete(), keys: [], keysAvailable: true })[4]).toBe(false);
    });
  });

  describe('registering a second agent restarts the run', () => {
    const second = {
      agent: agentFixture('agent_2', AFTER),
      detail: null,
      keys: [keyFixture(REGISTERED)],
      keysAvailable: true,
    };

    it('leaves only step one behind', () => {
      expect(reachedSteps(second)).toEqual([true, false, false, false, false]);
    });

    it('unticks the API key, so the run is walked in full', () => {
      expect(reachedSteps(second)[4]).toBe(false);
    });
  });
});

describe('newestFirst', () => {
  it('puts the most recently registered agent first', () => {
    const order = [agentFixture('old', BEFORE), agentFixture('new', AFTER)].sort(newestFirst);
    expect(order.map((a) => a.id)).toEqual(['new', 'old']);
  });

  it('never returns NaN, which is not a valid comparator result', () => {
    expect(Number.isNaN(newestFirst(agentFixture('a', 'not a date'), agentFixture('b')))).toBe(
      false,
    );
  });

  it('sorts an unreadable date last rather than scrambling the order', () => {
    const order = [
      agentFixture('broken', 'not a date'),
      agentFixture('old', BEFORE),
      agentFixture('new', AFTER),
    ].sort(newestFirst);
    expect(order.map((a) => a.id)).toEqual(['new', 'old', 'broken']);
  });
});

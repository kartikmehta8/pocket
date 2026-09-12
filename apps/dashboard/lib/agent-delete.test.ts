/**
 * What the delete dialog may offer, and when. Without the force path an agent
 * whose wallet has no gas can be neither emptied nor deleted, which is an
 * agent nobody can ever be rid of. After a sweep the chain can still report
 * the old balance, and pressing again must not send the money twice.
 */

import { describe, expect, it } from 'vitest';

import { planDelete } from './agent-delete';
import type { AgentSummary, Balance } from './types';

const OTHER = { id: 'agent_2', name: 'Scout' } as AgentSummary;
const FUNDED: Balance = { asset: 'USDC', amount: '4.99' };
const DUST: Balance = { asset: 'USDC', amount: '0.000001' };
const EMPTY: Balance = { asset: 'USDC', amount: '0' };

describe('planDelete', () => {
  it('moves the balance first when there is one', () => {
    const plan = planDelete(FUNDED, [OTHER], false);
    expect(plan.moveFirst).toBe(true);
    expect(plan.label).toBe('Move funds and delete');
    expect(plan.canProceed).toBe(true);
  });

  it('counts dust as a balance, because the API will too', () => {
    expect(planDelete(DUST, [OTHER], false).moveFirst).toBe(true);
  });

  it('deletes outright when the wallet is empty', () => {
    const plan = planDelete(EMPTY, [OTHER], false);
    expect(plan.moveFirst).toBe(false);
    expect(plan.label).toBe('Delete agent');
  });

  it('will not strand funds by default when there is nowhere to move them', () => {
    const plan = planDelete(FUNDED, [], false);
    expect(plan.stranded).toBe(true);
    expect(plan.canProceed).toBe(false);
    expect(plan.offerLeaveFunds).toBe(true);
  });

  it('lets the operator delete and leave the balance, once they say so', () => {
    const plan = planDelete(FUNDED, [], false, true);
    expect(plan.canProceed).toBe(true);
    expect(plan.moveFirst).toBe(false);
    expect(plan.label).toBe('Delete agent');
  });

  it('skips the move when leaving the funds, even with somewhere to move to', () => {
    expect(planDelete(FUNDED, [OTHER], false, true).moveFirst).toBe(false);
  });

  it('finishes the delete after a transfer that already went through', () => {
    const plan = planDelete(FUNDED, [OTHER], true);
    expect(plan.moveFirst).toBe(false);
    expect(plan.stranded).toBe(false);
    expect(plan.label).toBe('Delete agent');
  });

  it('treats an unreadable balance as nothing to move', () => {
    const plan = planDelete(null, [], false);
    expect(plan.moveFirst).toBe(false);
    expect(plan.stranded).toBe(false);
    expect(plan.offerLeaveFunds).toBe(false);
  });
});

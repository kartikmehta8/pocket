/**
 * What the delete dialog may offer, given a balance and what has already been
 * tried. Pure, so every branch is a table rather than a fixture.
 */

import { hasAmount } from './format';
import type { AgentSummary, Balance } from './types';

/** What the delete dialog should do next, and whether it can. */
export interface DeletePlan {
  /** Whether the balance has to move before the agent can be deleted. */
  moveFirst: boolean;
  /** Funds with nowhere to go, so moving them is not on offer. */
  stranded: boolean;
  /** Whether the confirming button can be pressed at all. */
  canProceed: boolean;
  /** What that button should say. */
  label: string;
  /**
   * Whether to offer deleting and leaving the balance where it is.
   *
   * @remarks Moving is not always possible. A wallet with no gas cannot send,
   * and a lone agent has nowhere to send to, and an agent that can be neither
   * emptied nor deleted is one nobody can ever be rid of. The way out is
   * offered, never taken automatically, and what is left behind is named.
   */
  offerLeaveFunds: boolean;
}

/**
 * Decides what deleting this agent involves.
 *
 * @param balance What the wallet holds, or `null` when the chain would not say.
 * @param others Agents the balance could move to, revoked ones already removed.
 * @param moved Whether the balance has already moved on this visit.
 * @param leaveFunds Whether the operator has chosen to delete without moving.
 * @returns The plan the dialog renders.
 * @remarks An unreadable balance is treated as nothing to move. The API reads
 * it again and refuses the delete if it turns out there is money there, so the
 * worst case is an honest refusal rather than stranded funds.
 *
 * `moved` matters because the delete can fail after a successful transfer: a
 * chain that has not caught up still reports the old balance. Pressing again
 * must finish the delete, not send the money a second time.
 *
 * Forcing is always available once there is a balance to force past, so the
 * only unpressable state is one the operator has not answered yet.
 */
export function planDelete(
  balance: Balance | null,
  others: AgentSummary[],
  moved: boolean,
  leaveFunds = false,
): DeletePlan {
  const funded = balance !== null && hasAmount(balance.amount);
  const moveFirst = funded && !moved && !leaveFunds;
  const stranded = funded && !moved && others.length === 0;
  return {
    moveFirst,
    stranded,
    canProceed: !stranded || leaveFunds,
    label: moveFirst ? 'Move funds and delete' : 'Delete agent',
    offerLeaveFunds: funded && !moved,
  };
}

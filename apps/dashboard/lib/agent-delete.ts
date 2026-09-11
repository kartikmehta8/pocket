import { hasAmount } from './format';
import type { AgentSummary, Balance } from './types';

/** What the delete dialog should do next, and whether it can. */
export interface DeletePlan {
  /** Whether the balance has to move before the agent can be deleted. */
  moveFirst: boolean;
  /** Funds with nowhere to go: deleting would strand them, and the API refuses. */
  stranded: boolean;
  /** Whether the confirming button can be pressed at all. */
  canProceed: boolean;
  /** What that button should say. */
  label: string;
}

/**
 * Decides what deleting this agent involves.
 *
 * @param balance What the wallet holds, or `null` when the chain would not say.
 * @param others Agents the balance could move to, revoked ones already removed.
 * @param moved Whether the balance has already moved on this visit.
 * @returns The plan the dialog renders.
 * @remarks An unreadable balance is treated as nothing to move. The API reads
 * it again and refuses the delete if it turns out there is money there, so the
 * worst case is an honest refusal rather than stranded funds.
 *
 * `moved` matters because the delete can fail after a successful transfer: a
 * chain that has not caught up still reports the old balance. Pressing again
 * must finish the delete, not send the money a second time.
 */
export function planDelete(
  balance: Balance | null,
  others: AgentSummary[],
  moved: boolean,
): DeletePlan {
  const funded = balance !== null && hasAmount(balance.amount);
  const moveFirst = funded && !moved;
  const stranded = moveFirst && others.length === 0;
  return {
    moveFirst,
    stranded,
    canProceed: !stranded,
    label: moveFirst ? 'Move funds and delete' : 'Delete agent',
  };
}

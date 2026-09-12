/**
 * How far through the setup guide an organization has got, decided from live
 * state rather than from anything it was told.
 */

import { hasAmount } from './format';
import type { ApiKey } from './types-account';
import type { AgentDetail, AgentSummary } from './types';

/** Everything the guide needs to decide which steps are behind it. */
export interface ProgressInput {
  /** The agent this run is following, or `null` before one exists. */
  agent: AgentSummary | null;
  /** That agent's detail, which carries its balance and policy. */
  detail: AgentDetail | null;
  /** The organization's unrevoked API keys. */
  keys: ApiKey[];
  /**
   * Whether key management is reachable at all.
   *
   * @remarks False for a machine principal, whose key list the API refuses.
   * The step then cannot be satisfied by anything the operator does here, so
   * it counts as behind them rather than stranding the guide one short
   * forever.
   */
  keysAvailable: boolean;
}

/**
 * How many of the seven steps this module can answer for.
 *
 * @remarks The last two — connecting a runtime and making a purchase — happen
 * in a terminal Pocket cannot see into, so the operator tells the guide when
 * they are done. Verifying them from payment records only ever produced false
 * negatives: a purchase made from a different agent, or before this run, or
 * outside the window, left a finished setup looking unfinished.
 */
export const DERIVED_STEPS = 5;

/**
 * Reads an ISO timestamp, or `null` when it is not one.
 *
 * @param value - An ISO timestamp from the API.
 * @returns Epoch milliseconds, or `null`.
 */
function instant(value: string): number | null {
  const at = Date.parse(value);
  return Number.isFinite(at) ? at : null;
}

/**
 * Orders agents newest first.
 *
 * @param a - One agent.
 * @param b - Another.
 * @returns A comparator result that is never `NaN`.
 * @remarks An unreadable date sorts last rather than poisoning the
 * comparison. `NaN` from a subtraction is not a valid comparator result and
 * leaves the whole order unspecified, which would make "the newest agent"
 * mean whatever the engine happened to do.
 */
export function newestFirst(a: AgentSummary, b: AgentSummary): number {
  return (instant(b.createdAt) ?? -Infinity) - (instant(a.createdAt) ?? -Infinity);
}

/**
 * Which of the first five steps are already satisfied, in order.
 *
 * @param input - Live state for the agent the guide is following.
 * @returns One flag per derived step, `true` where the system can see it.
 * @remarks These five leave a record: an agent exists, a balance arrived,
 * a budget and a policy were written, a key was minted. None is read from a
 * remembered click, so the guide cannot claim credit for something that did
 * not happen.
 *
 * The agent is the run. Registering one starts the guide over, and every
 * later step asks only about that agent and about what has happened since it
 * was registered.
 *
 * An agent whose registration time cannot be read is treated as having always
 * existed, so its own records still count rather than none of them.
 */
export function reachedSteps({ agent, detail, keys, keysAvailable }: ProgressInput): boolean[] {
  if (agent === null) return Array.from({ length: DERIVED_STEPS }, () => false);

  const start = instant(agent.createdAt) ?? -Infinity;
  const since = (createdAt: string): boolean => {
    const at = instant(createdAt);
    return at !== null && at >= start;
  };

  return [
    true,
    hasAmount(detail?.balance?.amount),
    detail?.agent.budget != null,
    detail?.policy != null,
    !keysAvailable || keys.some((key) => since(key.createdAt)),
  ];
}

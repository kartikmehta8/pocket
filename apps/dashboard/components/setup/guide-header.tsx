'use client';

import { RestartButton } from './restart-button';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** Props for {@link GuideHeader}. */
export interface GuideHeaderProps {
  /** How many steps are behind the operator. */
  done: number;
  /** How many steps there are. */
  total: number;
  /** Whether the guide is rendering a fresh run rather than live progress. */
  restarted: boolean;
  /** Whether the server is re-rendering after a press. */
  pending: boolean;
  /** Puts the guide back to an empty run. */
  onRestart: () => void;
}

/**
 * Names where the run has got to.
 *
 * @param restarted - Whether the guide was started over.
 * @param done - How many steps are behind the operator.
 * @param total - How many steps there are.
 * @returns The card's title.
 */
function headline(restarted: boolean, done: number, total: number): string {
  if (restarted) return 'Start here';
  if (done === 0) return 'Start here';
  if (done === total) return 'Everything is connected';
  return 'Your progress';
}

/**
 * Says what to do next rather than only what has happened.
 *
 * @param restarted - Whether the guide was started over.
 * @param done - How many steps are behind the operator.
 * @param total - How many steps there are.
 * @returns One line of guidance for the card.
 * @remarks A finished guide that reports "7 of 7" and stops is a dead end.
 * Each ending points somewhere: at the first step, at the next one, or at the
 * pages where the agent's spending actually shows up.
 */
function guidance(restarted: boolean, done: number, total: number): string {
  if (restarted) {
    return 'A fresh run, exactly as it looks the first time. Name an agent below and the guide follows that one. Nothing was deleted — your existing agents and keys are on their own pages, untouched.';
  }
  if (done === 0) {
    return `${total} steps, in order. The first five tick themselves once the system can see the result; the last two happen in your terminal, so you confirm those.`;
  }
  if (done === total) {
    return 'Your agent has paid for its own data. Watch what it spends on Payments and Audit, or walk the guide again from the top.';
  }
  return `${done} of ${total} done. Pick up at the step marked "Do this next".`;
}

/**
 * The guide's header: where the run stands, and the way to start it over.
 *
 * @param props How far the run has got, and the restart handler.
 * @remarks The restart is offered at every point in the run. Withholding it
 * until the end assumed the only reason to start over is having finished,
 * which is the opposite of true.
 */
export function GuideHeader({ done, total, restarted, pending, onRestart }: GuideHeaderProps) {
  return (
    // Wraps rather than squeezing: on a phone the description and the control
    // cannot share a row without one of them losing.
    <CardHeader className="flex-wrap">
      <div className="min-w-0">
        <CardTitle>{headline(restarted, done, total)}</CardTitle>
        <CardDescription>{guidance(restarted, done, total)}</CardDescription>
      </div>

      {/* Always offered. Somebody who wants to start over halfway through
          wants it more than somebody who has just finished. */}
      <RestartButton onRestart={onRestart} pending={pending} label="Restart guide, from the top" />
    </CardHeader>
  );
}

'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { formatAmount } from '@/lib/format';
import { DURATION, EASE, fade, revealPanel } from '@/lib/motion';
import { outcomePresentation } from '@/lib/status';
import { TONE_RULE } from '@/components/ui/tones';
import type { Decision } from '@/lib/types';

/** One before/after headroom pair. */
function Headroom({
  label,
  before,
  after,
  asset,
}: {
  label: string;
  before: string;
  after: string;
  asset: string;
}) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="figures text-text mt-0.5 text-sm">
        {formatAmount(before, asset)}
        <span className="text-text-muted mx-1.5">→</span>
        <span className="font-semibold">{formatAmount(after, null)}</span>
      </p>
    </div>
  );
}

/** Props for {@link DecisionReveal}. */
export interface DecisionRevealProps {
  decision: Decision | null;
  /** Error text when the preview call itself failed. */
  error: string;
  /** Bumped on every submission so an identical repeat decision re-animates. */
  revision: number;
}

/**
 * The policy verdict, revealed as it lands. The whole panel is an `aria-live`
 * region so the outcome is announced, and the outcome is carried by an icon
 * and a label as well as the tone.
 */
export function DecisionReveal({ decision, error, revision }: DecisionRevealProps) {
  const reduced = useReducedMotion();
  const outcome = decision ? outcomePresentation(decision.outcome) : null;

  return (
    <div aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        {error !== '' ? (
          <motion.p
            key={`error-${revision}`}
            variants={fade}
            initial="hidden"
            animate="shown"
            exit="hidden"
            className="text-danger-ink text-xs font-medium"
          >
            {error}
          </motion.p>
        ) : decision && outcome ? (
          <motion.div
            key={`decision-${revision}`}
            variants={reduced ? fade : revealPanel}
            initial="hidden"
            animate="shown"
            exit="exit"
            className={cn('bg-ash-25 rounded-md border-l-2 p-4', TONE_RULE[outcome.tone])}
          >
            <div className="flex items-center gap-2">
              <Badge tone={outcome.tone} icon={outcome.Icon} hint={outcome.hint}>
                {outcome.label}
              </Badge>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Headroom
                label="Daily remaining"
                before={decision.headroom.dailyRemaining}
                after={decision.headroom.dailyRemainingAfter}
                asset={decision.asset}
              />
              {decision.headroom.taskRemaining !== null &&
              decision.headroom.taskRemainingAfter !== null ? (
                <Headroom
                  label="Task remaining"
                  before={decision.headroom.taskRemaining}
                  after={decision.headroom.taskRemainingAfter}
                  asset={decision.asset}
                />
              ) : null}
            </div>

            {decision.violations.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-1.5">
                {decision.violations.map((violation, index) => (
                  <motion.li
                    key={violation.code}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: DURATION.base,
                      ease: EASE,
                      delay: 0.06 + index * 0.05,
                    }}
                    className="text-text-secondary text-xs"
                  >
                    <code className="text-2xs text-danger-ink mr-1.5 font-mono">
                      {violation.code}
                    </code>
                    {violation.message}
                  </motion.li>
                ))}
              </ul>
            ) : null}

            {decision.approvalReasons.length > 0 ? (
              <ul className="text-text-secondary mt-3 flex flex-col gap-1 text-xs">
                {decision.approvalReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

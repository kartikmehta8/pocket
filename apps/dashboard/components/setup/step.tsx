import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * How far a step has got.
 *
 * `current` is the first one still outstanding. Naming it separately is what
 * lets the page point at one thing to do next instead of showing seven
 * identical panels and leaving the reader to find their place.
 */
export type StepState = 'done' | 'current' | 'todo';

/** Props for {@link Step}. */
export interface StepProps {
  /** Position in the sequence, shown beside the title. */
  index: number;
  /** How many steps there are, so the reader knows what is left. */
  total: number;
  title: string;
  /** One line saying what this step accomplishes. */
  summary: string;
  /** Marker glyph. Replaced by a check once the step is done. */
  icon: LucideIcon;
  /**
   * Whether the system can already see this step's result.
   *
   * @remarks Derived from live state — an agent exists, a balance arrived, a
   * payment settled — never from a checkbox the operator ticked themselves.
   */
  state: StepState;
  /** Whether a connector runs down to the next step. */
  last?: boolean;
  children: ReactNode;
}

/** The pill beside the title, which is the only place the state is written out. */
const BADGE: Record<StepState, { label: string; className: string } | null> = {
  done: {
    label: 'Done',
    className: 'bg-success-soft text-success-ink ring-success-line',
  },
  current: {
    label: 'Do this next',
    className: 'bg-accent-50 text-accent-700 ring-accent-200',
  },
  todo: null,
};

/**
 * One step in the setup sequence.
 *
 * @remarks Three things carry the state, none of them colour alone: the
 * marker's glyph, a written pill, and a screen-reader-only line. The connector
 * beneath a finished step is solid and the rest are dashed, so the eye can see
 * how far the run has got without reading any of them.
 */
export function Step({
  index,
  total,
  title,
  summary,
  icon: Icon,
  state,
  last = false,
  children,
}: StepProps) {
  const done = state === 'done';
  const badge = BADGE[state];

  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      {last ? null : (
        <span
          aria-hidden
          className={cn(
            'absolute top-10 bottom-1 left-[0.9375rem] w-0',
            done ? 'border-success border-l-2' : 'border-divider border-l-2 border-dashed',
          )}
        />
      )}

      <span
        aria-hidden
        className={cn(
          'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-lg border',
          'transition-colors duration-(--duration-base) ease-(--ease-brand)',
          done
            ? 'border-border bg-success text-white'
            : state === 'current'
              ? 'border-border bg-accent-100 text-accent-700 ring-accent-200 ring-2'
              : 'border-border bg-surface text-ash-400',
        )}
      >
        {done ? (
          <Check className="size-4" strokeWidth={2.5} />
        ) : (
          <Icon className="size-4" strokeWidth={1.75} />
        )}
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="eyebrow">
          Step {index} of {total}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h3 className="text-text text-sm font-semibold tracking-tight">{title}</h3>
          <span className="sr-only">
            {done ? 'Complete' : state === 'current' ? 'Next to do' : 'Not started'}
          </span>
          {badge ? (
            <span
              className={cn(
                'text-2xs rounded-full px-1.5 py-0.5 font-medium ring-1 ring-inset',
                badge.className,
              )}
            >
              {badge.label}
            </span>
          ) : null}
        </div>
        <p className="text-text-secondary mt-1 text-sm leading-relaxed">{summary}</p>
        <div className="mt-3 flex flex-col gap-3">{children}</div>
      </div>
    </li>
  );
}

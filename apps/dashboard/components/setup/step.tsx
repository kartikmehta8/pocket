/**
 * One step of the guide: its marker, its spine and its body.
 */

import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { stepAnchor } from './steps';

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
   * How far this step has got.
   *
   * @remarks Resolved by the guide, not here. Most steps read it from live
   * state — an agent exists, a balance arrived, a policy was written — but the
   * two that happen in a terminal are confirmed by the operator instead.
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
 * @remarks The state is carried by more than colour: the marker's glyph, and
 * a written pill — or, for the one state that has no pill, a spoken line. The connector
 * beneath a finished step is solid and the rest are dashed, so the eye can see
 * how far the run has got without reading any of them.
 *
 * A finished step is a tinted disc rather than a filled green block. Seven of
 * those stacked down a column shout louder than the one step still asking to
 * be done, which is the only thing on the page anybody has to act on.
 *
 * The connector uses the theme’s hairline like the markers rather than a colour
 * of its own: solid against dashed carries the difference, and colour was never
 * doing the work. The finished marker keeps the same black hairline the theme
 * puts around every other container, because a soft green edge made it read as
 * a different family of object from the two beside it.
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
    <li id={stepAnchor(index)} className="relative flex scroll-mt-20 gap-3.5 pb-7 last:pb-0">
      {/* Geometry, so the connector meets the marker instead of near it: the
          marker is 1.75rem, the rule 1px. Centre is 0.875rem, so the rule sits
          there exactly and starts 0.5rem below the marker's foot. */}
      {last ? null : (
        <span
          aria-hidden
          className={cn(
            'absolute top-9 bottom-1 left-[0.875rem] w-0 border-l',
            done ? 'border-border' : 'border-divider border-dashed',
          )}
        />
      )}

      <span
        aria-hidden
        className={cn(
          'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border',
          'transition-colors duration-(--duration-base) ease-(--ease-brand)',
          'border-border',
          done
            ? 'bg-success-soft text-success-ink'
            : state === 'current'
              ? 'bg-accent-100 text-accent-700 ring-accent-200 ring-2'
              : 'bg-surface text-ash-400',
        )}
      >
        {done ? (
          <Check className="size-3.5" strokeWidth={2.75} />
        ) : (
          <Icon className="size-3.5" strokeWidth={1.75} />
        )}
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="eyebrow">
          Step {index} of {total}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h3 className="text-text text-sm font-semibold tracking-tight">{title}</h3>
          {/* Only for the one state with no visible pill. Rendering it for
              the others makes a screen reader say "Complete" then "Done". */}
          {badge === null ? <span className="sr-only">Not started</span> : null}
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

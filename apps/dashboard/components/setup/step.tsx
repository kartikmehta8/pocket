import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

import { cn } from '@/lib/cn';

/** Props for {@link Step}. */
export interface StepProps {
  /** Position in the sequence, shown in the gutter marker. */
  index: number;
  title: string;
  /** One line saying what this step accomplishes. */
  summary: string;
  /**
   * Whether the system can already see this step's result.
   *
   * @remarks Derived from live state — an agent exists, a key exists, a
   * payment settled — never from a checkbox the operator ticked themselves.
   */
  done: boolean;
  /** Whether a connector runs down to the next step. */
  last?: boolean;
  children: ReactNode;
}

/**
 * One numbered step in the setup sequence.
 *
 * The marker turns into a check once the underlying state exists, so an
 * operator returning to this page sees how far they actually got rather than
 * how far they remember getting.
 */
export function Step({ index, title, summary, done, last = false, children }: StepProps) {
  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      {last ? null : (
        <span aria-hidden className="bg-divider absolute top-9 bottom-1 left-[0.9375rem] w-px" />
      )}

      <span
        aria-hidden
        className={cn(
          'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          'transition-colors duration-(--duration-base) ease-(--ease-brand)',
          done
            ? 'border-border bg-success border text-white'
            : 'border-border bg-surface text-text border',
        )}
      >
        {done ? <Check className="size-4" strokeWidth={2.5} /> : index}
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-text text-sm font-semibold tracking-tight">{title}</h3>
          <span className="sr-only">{done ? 'Complete' : 'Not started'}</span>
          {done ? (
            <span className="bg-success-soft text-success-ink ring-success-line text-2xs rounded-full px-1.5 py-0.5 font-medium ring-1 ring-inset">
              Done
            </span>
          ) : null}
        </div>
        <p className="text-text-secondary mt-1 text-sm leading-relaxed">{summary}</p>
        <div className="mt-3 flex flex-col gap-3">{children}</div>
      </div>
    </li>
  );
}

/**
 * The small `i` that explains what a figure means.
 */

import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { Hint } from './tooltip';

/** Props for {@link InfoHint}. */
export interface InfoHintProps {
  /** What this explains. Plain text or short inline markup. */
  label: ReactNode;
  /**
   * What it is attached to, lower case, for the screen-reader name.
   *
   * @remarks Read as "About the daily limit", so a reader who cannot see the
   * icon is told which heading it belongs to rather than hearing "info" eight
   * times down a form.
   */
  subject: string;
  className?: string;
}

/**
 * The small `i` beside a heading, label or figure that explains what it means.
 *
 * @remarks One component for every one of them, because the affordance is a
 * promise: wherever this icon appears, hovering or focusing it says what the
 * thing does. A tooltip never carries the only copy of something that matters —
 * the value is on the page, and this says how it is used.
 */
export function InfoHint({ label, subject, className }: InfoHintProps) {
  return (
    <Hint label={label}>
      <span
        className={cn(
          'text-ash-400 hover:text-text-secondary inline-flex cursor-help align-middle',
          'transition-colors duration-(--duration-fast) ease-(--ease-brand)',
          className,
        )}
      >
        <Info aria-hidden className="size-3.5" strokeWidth={2.25} />
        <span className="sr-only">About {subject}</span>
      </span>
    </Hint>
  );
}

import { Info, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import type { Tone } from '@/lib/status';

import { NumberRoll } from './number-roll';
import { TONE_INK } from './tones';
import { Hint } from './tooltip';

/** Props for {@link StatTile}. */
export interface StatTileProps {
  /** Sentence-case label, no trailing colon. */
  label: string;
  /** Exact decimal string, or a plain string for non-monetary counts. */
  value: string;
  /** Fraction digits; pass `0` for counts. */
  decimals?: number;
  /** Unit suffix rendered beside the value, e.g. an asset ticker. */
  unit?: string;
  /** Optional signed change against a named period. */
  delta?: { text: string; tone: Tone };
  /** Optional icon, muted, sitting opposite the label. */
  icon?: LucideIcon;
  /**
   * What this number means and how it is derived.
   *
   * @remarks Shown behind an info affordance. The tooltip explains; it never
   * holds the only copy of something the reader needs.
   */
  hint?: ReactNode;
  /** Optional slot beneath the value — typically a meter. */
  footer?: ReactNode;
  className?: string;
}

/**
 * A single headline number. The value is the chart: no one-bar bar chart, no
 * sparkline unless the trend is the point. The number rolls up on mount and
 * uses proportional figures once settled.
 */
export function StatTile({
  label,
  value,
  decimals = 2,
  unit,
  delta,
  icon: Icon,
  hint,
  footer,
  className,
}: StatTileProps) {
  return (
    <div
      className={cn(
        'bg-surface ring-border group flex h-full flex-col justify-between gap-3 rounded-lg p-4 ring-1 ring-inset',
        'hover:shadow-pop-sm transition-shadow duration-(--duration-base) ease-(--ease-brand)',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="eyebrow flex items-center gap-1">
          {label}
          {hint === undefined ? null : (
            <Hint label={hint}>
              <span className="text-ash-400 hover:text-text-secondary inline-flex cursor-help transition-colors duration-(--duration-fast)">
                <Info aria-hidden className="size-3" strokeWidth={2.25} />
                <span className="sr-only">About {label}</span>
              </span>
            </Hint>
          )}
        </p>
        {Icon ? (
          <Icon
            aria-hidden
            className="text-ash-400 group-hover:text-ash-500 size-3.5 transition-colors duration-(--duration-base)"
            strokeWidth={1.75}
          />
        ) : null}
      </div>
      <div>
        <p className="text-text flex items-baseline gap-1.5 text-3xl font-semibold tracking-tight">
          <NumberRoll value={value} decimals={decimals} />
          {unit ? <span className="text-md text-text-muted font-medium">{unit}</span> : null}
        </p>
        {delta ? (
          <p className={cn('figures mt-1 text-xs font-medium', TONE_INK[delta.tone])}>
            {delta.text}
          </p>
        ) : null}
      </div>
      {footer ? <div>{footer}</div> : null}
    </div>
  );
}

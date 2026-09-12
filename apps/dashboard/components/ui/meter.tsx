/**
 * The budget usage meter.
 */

import { cn } from '@/lib/cn';
import { usageTone } from '@/lib/status';

import { TONE_FILL, TONE_TRACK } from './tones';

/** Props for {@link Meter}. */
export interface MeterProps {
  /** Consumed fraction in `0..1`. */
  ratio: number;
  /** Accessible label describing what is being consumed. */
  label: string;
  /** Text shown to sighted users, e.g. `"1.20 of 5.00 USDC"`. */
  valueText: string;
  className?: string;
}

/**
 * Budget usage meter. The fill carries severity (accent → warning → danger)
 * and the track is a lighter step of the same ramp, so the state reads across
 * the whole bar rather than only where it is filled.
 */
export function Meter({ ratio, label, valueText, className }: MeterProps) {
  const clamped = Math.min(1, Math.max(0, ratio));
  const tone = usageTone(clamped);
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped * 100)}
        aria-valuetext={valueText}
        className={cn('h-1.5 w-full overflow-hidden rounded-full', TONE_TRACK[tone])}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-(--duration-slow) ease-(--ease-brand)',
            TONE_FILL[tone],
          )}
          style={{ width: `${Math.max(clamped * 100, clamped > 0 ? 2 : 0)}%` }}
        />
      </div>
      <p className="figures text-text-muted text-xs">{valueText}</p>
    </div>
  );
}

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import type { Tone } from '@/lib/status';

import { TONE_CHIP } from './tones';
import { Hint } from './tooltip';

/** Props for {@link Badge}. */
export interface BadgeProps {
  /** Semantic colour role. */
  tone?: Tone;
  /** Optional leading icon — status colour is never the only signal. */
  icon?: LucideIcon;
  /**
   * What the state means, revealed on hover or focus.
   *
   * @remarks Optional, and always redundant: the badge already says what the
   * state is, and the page already shows the evidence. This says why it matters.
   */
  hint?: ReactNode;
  /** Badge text. */
  children: ReactNode;
  className?: string;
}

/**
 * Small status chip: soft fill, hairline ring, icon plus label.
 *
 * @param props Tone, optional icon, optional hint and label content.
 */
export function Badge({ tone = 'neutral', icon: Icon, hint, children, className }: BadgeProps) {
  const chip = (
    <span
      className={cn(
        'text-2xs inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium whitespace-nowrap ring-1 ring-inset',
        hint === undefined ? '' : 'cursor-help',
        TONE_CHIP[tone],
        className,
      )}
    >
      {Icon ? <Icon aria-hidden className="size-3 shrink-0" strokeWidth={2.25} /> : null}
      {children}
    </span>
  );

  return hint === undefined ? chip : <Hint label={hint}>{chip}</Hint>;
}

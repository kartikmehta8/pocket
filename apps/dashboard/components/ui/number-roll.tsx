'use client';

import { animate, useMotionValue, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/cn';
import { DURATION, EASE } from '@/lib/motion';
import { formatMoney, toPlotNumber } from '@/lib/format';

/** Props for {@link NumberRoll}. */
export interface NumberRollProps {
  /** Exact decimal string from the API — the value the roll settles on. */
  value: string;
  /** Fraction digits to display. */
  decimals?: number;
  className?: string;
}

/**
 * Counts a stat-tile value up from zero on mount, then snaps to the exact
 * decimal string the API returned — intermediate frames are decoration only
 * and never a monetary claim. Under `prefers-reduced-motion` the final value
 * is rendered immediately.
 *
 * Digits are tabular while the number is in motion so the already-placed
 * digits do not jitter, then proportional once settled, as display figures
 * should be.
 */
export function NumberRoll({ value, decimals = 2, className }: NumberRollProps) {
  const reduced = useReducedMotion();
  const settled = formatMoney(value, decimals);
  const progress = useMotionValue(0);
  const [display, setDisplay] = useState(settled);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    if (reduced) {
      setDisplay(settled);
      return;
    }
    const target = toPlotNumber(value);
    setRolling(true);
    progress.set(0);
    const controls = animate(progress, target, {
      duration: DURATION.slow * 2,
      ease: EASE,
      onUpdate: (current) => setDisplay(formatMoney(current.toFixed(decimals), decimals)),
    });
    void controls.then(() => {
      setDisplay(settled);
      setRolling(false);
    });
    return () => controls.stop();
  }, [decimals, progress, reduced, settled, value]);

  return <span className={cn(rolling && 'figures', className)}>{display}</span>;
}

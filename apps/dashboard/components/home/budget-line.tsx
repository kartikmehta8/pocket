'use client';

import { motion, useReducedMotion } from 'motion/react';

import { DURATION, EASE } from '@/lib/motion';
import { DAILY_LIMIT, SAMPLE_DAYS } from './sample-data';

/** Drawing box. Scales to the container; the numbers are only a coordinate space. */
const WIDTH = 300;
const HEIGHT = 96;
const PAD_X = 6;
const PAD_TOP = 12;
const PAD_BOTTOM = 10;

/** Headroom above the limit, so the ceiling is not flush with the top edge. */
const Y_MAX = DAILY_LIMIT * 1.16;

/** Maps a spend value to a y coordinate. */
function y(value: number): number {
  const usable = HEIGHT - PAD_TOP - PAD_BOTTOM;
  return PAD_TOP + (1 - value / Y_MAX) * usable;
}

/** Maps a day index to an x coordinate. */
function x(index: number, total: number): number {
  const usable = WIDTH - PAD_X * 2;
  return PAD_X + (index / Math.max(total - 1, 1)) * usable;
}

/** The spend series as an SVG path. */
function linePath(): string {
  return SAMPLE_DAYS.map(
    (day, index) =>
      `${index === 0 ? 'M' : 'L'} ${x(index, SAMPLE_DAYS.length).toFixed(1)} ${y(day.spend).toFixed(1)}`,
  ).join(' ');
}

/**
 * A compact spend line for the closing panel.
 *
 * Hand-drawn SVG rather than a chart library: it carries no axes, no tooltip
 * and no interaction, so pulling in a charting runtime for it would be weight
 * with nothing to show for it. The line draws itself once on view, which is
 * the only reason it is animated at all.
 */
export function BudgetLine() {
  const reduced = useReducedMotion();
  const last = SAMPLE_DAYS[SAMPLE_DAYS.length - 1];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-24 w-full"
      role="img"
      aria-label={`Daily spend across ${SAMPLE_DAYS.length} days, never crossing the ${DAILY_LIMIT.toFixed(2)} limit.`}
    >
      <line
        x1={PAD_X}
        x2={WIDTH - PAD_X}
        y1={y(DAILY_LIMIT)}
        y2={y(DAILY_LIMIT)}
        stroke="rgb(255 255 255 / 0.45)"
        strokeWidth="1"
        strokeDasharray="4 4"
      />

      <motion.path
        d={linePath()}
        fill="none"
        stroke="white"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={reduced ? { duration: 0 } : { duration: 1.4, ease: EASE, delay: 0.2 }}
      />

      {last === undefined ? null : (
        <motion.circle
          cx={x(SAMPLE_DAYS.length - 1, SAMPLE_DAYS.length)}
          cy={y(last.spend)}
          r="3.5"
          fill="white"
          initial={reduced ? { opacity: 1 } : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={reduced ? { duration: 0 } : { duration: DURATION.base, delay: 1.5 }}
        />
      )}
    </svg>
  );
}

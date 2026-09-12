'use client';

/**
 * One easing curve and three durations, mirrored from the CSS tokens so a
 * component and a stylesheet cannot disagree.
 */

import type { Transition, Variants } from 'motion/react';

/**
 * One easing curve and three durations for the whole product.
 * These mirror `--ease-brand` / `--duration-*` in `app/globals.css`.
 */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Duration tokens in seconds, as `motion` expects them. */
export const DURATION = { fast: 0.15, base: 0.22, slow: 0.38 } as const;

/** Default transition applied to entrances and layout changes. */
export const TRANSITION: Transition = { duration: DURATION.base, ease: EASE };

/** Container that reveals its children with a short stagger. */
export const staggerContainer: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
};

/** Child of {@link staggerContainer} — rises a few pixels as it fades in. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0, transition: TRANSITION },
};

/** Plain fade, for elements that must not move (reduced motion, tooltips). */
export const fade: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: DURATION.fast, ease: EASE } },
};

/** Row expansion for payment and audit detail drawers. */
export const expandRow: Variants = {
  hidden: { opacity: 0, height: 0 },
  shown: { opacity: 1, height: 'auto', transition: TRANSITION },
  exit: { opacity: 0, height: 0, transition: { duration: DURATION.fast, ease: EASE } },
};

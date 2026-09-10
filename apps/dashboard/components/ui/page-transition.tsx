'use client';

import { motion, useReducedMotion } from 'motion/react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { DURATION, EASE } from '@/lib/motion';

/**
 * Fades the content column in on every navigation.
 *
 * Keyed on the pathname so a route change re-runs the entrance. Under
 * `prefers-reduced-motion` nothing moves: the opacity change is dropped
 * entirely rather than shortened, because a flash is worse than no animation.
 *
 * @param children The active page.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  // Only the animation is dropped, never the layout: returning the children
  // bare would take the column's spacing with it and collapse the page.
  if (reduced) return <div className="gap-section flex w-full flex-col">{children}</div>;

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE }}
      className="gap-section flex w-full flex-col"
    >
      {children}
    </motion.div>
  );
}

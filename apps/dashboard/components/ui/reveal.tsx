'use client';

/**
 * The entrance animation a group of elements shares.
 */

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { fade, staggerContainer, staggerItem } from '@/lib/motion';

/** Props for {@link Stagger} and {@link StaggerItem}. */
interface RevealProps {
  className?: string;
  children: ReactNode;
}

/**
 * Entrance container: reveals its {@link StaggerItem} children with a 45ms
 * stagger. When the viewer prefers reduced motion the children fade only —
 * no transform is applied.
 */
export function Stagger({ className, children }: RevealProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="shown"
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

/**
 * A single staggered child. Rises 8px as it fades in, or fades in place under
 * `prefers-reduced-motion`.
 */
export function StaggerItem({ className, children }: RevealProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div variants={reduced ? fade : staggerItem} className={cn(className)}>
      {children}
    </motion.div>
  );
}

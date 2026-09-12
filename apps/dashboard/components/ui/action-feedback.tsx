'use client';

/**
 * The inline result of a server action.
 */

import { CircleCheck, TriangleAlert } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

import { cn } from '@/lib/cn';
import type { ActionState } from '@/lib/action-state';
import { DURATION, EASE } from '@/lib/motion';

/**
 * Inline result of a server action, announced politely. Every mutation form on
 * the dashboard renders one so success and failure are never silent.
 */
export function ActionFeedback({ state, className }: { state: ActionState; className?: string }) {
  const reduced = useReducedMotion();
  const success = state.status === 'success';

  return (
    <div aria-live="polite" className={cn('min-h-5', className)}>
      <AnimatePresence initial={false} mode="wait">
        {state.status === 'idle' ? null : (
          <motion.p
            key={state.message}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.fast, ease: EASE }}
            className={cn(
              'inline-flex items-center gap-1.5 text-xs font-medium',
              success ? 'text-success-ink' : 'text-danger-ink',
            )}
          >
            {success ? (
              <CircleCheck aria-hidden className="size-3.5" strokeWidth={2.25} />
            ) : (
              <TriangleAlert aria-hidden className="size-3.5" strokeWidth={2.25} />
            )}
            {state.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

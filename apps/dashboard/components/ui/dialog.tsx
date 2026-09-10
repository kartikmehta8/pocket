'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { DURATION, EASE } from '@/lib/motion';

/** Props for {@link Dialog}. */
export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** A wider panel, for content that is read rather than filled in. */
  wide?: boolean;
  children: ReactNode;
}

/**
 * Modal dialog: focus-trapped and escape-dismissable via Radix, with a scrim
 * fade and a short rise on the panel. Exit is animated through
 * `AnimatePresence`, so the panel is never yanked off screen.
 */
export function Dialog({ open, onOpenChange, title, description, wide, children }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DURATION.fast, ease: EASE }}
                className="bg-ash-950/25 fixed inset-0 z-50 backdrop-blur-[1px]"
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.99 }}
                transition={{ duration: DURATION.base, ease: EASE }}
                className={cn(
                  'bg-surface shadow-e3 ring-border fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-lg p-5 ring-1 ring-inset',
                  wide ? 'w-[min(44rem,calc(100vw-2rem))]' : 'w-[min(28rem,calc(100vw-2rem))]',
                )}
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <DialogPrimitive.Title className="text-md text-text font-semibold tracking-tight">
                      {title}
                    </DialogPrimitive.Title>
                    {description ? (
                      <DialogPrimitive.Description className="text-text-muted mt-0.5 text-sm">
                        {description}
                      </DialogPrimitive.Description>
                    ) : null}
                  </div>
                  <DialogPrimitive.Close
                    aria-label="Close dialog"
                    className="text-ash-400 hover:bg-ash-50 hover:text-text inline-flex size-6 cursor-pointer items-center justify-center rounded-sm"
                  >
                    <X aria-hidden className="size-4" strokeWidth={2} />
                  </DialogPrimitive.Close>
                </div>
                {children}
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

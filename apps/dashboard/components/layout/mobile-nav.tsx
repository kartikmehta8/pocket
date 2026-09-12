'use client';

/**
 * The navigation rail on a narrow viewport.
 */

import * as Dialog from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * The rail on a narrow viewport: a slim bar that opens it as a drawer.
 *
 * Below `lg` the rail cannot simply stack above the page. Laid out flat it is
 * a wordmark, eight destinations and an adapter panel, which is a screenful of
 * furniture before any content appears. Behind a toggle it costs one row and
 * still opens as the same rail rather than a reduced version of it.
 *
 * @param children The rail content, rendered inside the drawer.
 * @remarks Built on the dialog primitive for the parts that are easy to get
 * wrong by hand: focus is trapped while open, Escape closes, the page behind
 * stops scrolling, and the trigger is described to a screen reader.
 *
 * Choosing a destination should leave; the drawer has done its job.
 */
export function MobileNav({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className={cn(
          'text-text-secondary hover:bg-ash-100 hover:text-text inline-flex size-9 items-center',
          'justify-center rounded-md transition-colors duration-(--duration-fast) ease-(--ease-brand)',
          'focus-visible:ring-accent-300 focus-visible:ring-2 focus-visible:outline-none',
          'lg:hidden',
        )}
      >
        <Menu aria-hidden className="size-5" strokeWidth={1.75} />
        <span className="sr-only">Open navigation</span>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="bg-ash-950/30 overlay-pop fixed inset-0 z-40 backdrop-blur-[2px] lg:hidden" />
        <Dialog.Content
          className={cn(
            'border-border bg-surface drawer-in fixed inset-y-0 left-0 z-50 flex',
            'w-[min(17rem,85vw)] flex-col border-r lg:hidden',
          )}
        >
          <VisuallyHidden.Root>
            <Dialog.Title>Navigation</Dialog.Title>
          </VisuallyHidden.Root>

          <Dialog.Close
            className={cn(
              'text-ash-400 hover:bg-ash-100 hover:text-text absolute top-4 right-3 inline-flex',
              'size-8 items-center justify-center rounded-md',
              'transition-colors duration-(--duration-fast) ease-(--ease-brand)',
              'focus-visible:ring-accent-300 focus-visible:ring-2 focus-visible:outline-none',
            )}
          >
            <X aria-hidden className="size-4" strokeWidth={2} />
            <span className="sr-only">Close navigation</span>
          </Dialog.Close>

          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export const TooltipProvider = TooltipPrimitive.Provider;

/**
 * A hint attached to any element.
 *
 * Tooltips explain, they never carry the only copy of something important — a
 * value that matters is on the page, and this says what it means.
 *
 * @param label What to explain. Plain text or short inline markup.
 * @param side Which edge to prefer.
 * @param children The trigger. Must accept a ref, so wrap bare text in a span.
 */
export function Hint({
  label,
  side = 'top',
  children,
  ...props
}: {
  label: ReactNode;
  children: ReactNode;
} & Pick<ComponentProps<typeof TooltipPrimitive.Content>, 'side' | 'align'>) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={12}
          {...props}
          className={cn(
            'bg-ash-950 z-50 max-w-[17rem] rounded-md px-2.5 py-1.5 text-xs leading-snug text-white',
            'shadow-e3 overlay-pop',
          )}
        >
          {label}
          <TooltipPrimitive.Arrow className="fill-ash-950" width={10} height={5} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

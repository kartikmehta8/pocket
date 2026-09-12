'use client';

/**
 * The modal that registers an agent, opened from the agents index.
 */

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Bot, Plus, X } from 'lucide-react';
import { useState } from 'react';

import { AgentCreateForm } from './agent-create-form';
import { Button } from '@/components/ui/button';

/**
 * Registers an agent from a modal, so the agents index does not carry a form
 * it only needs occasionally.
 *
 * @param label Trigger text. Defaults to the short form used in the masthead.
 */
export function AgentCreateDialog({ label = 'New agent' }: { label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button icon={Plus}>{label}</Button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="bg-ash-950/30 overlay-pop fixed inset-0 z-40 backdrop-blur-[2px]" />
        <DialogPrimitive.Content className="bg-surface shadow-e3 border-border overlay-pop fixed top-1/2 left-1/2 z-50 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="border-border bg-accent-100 text-accent-700 flex size-9 shrink-0 items-center justify-center rounded-md border">
                <Bot aria-hidden className="size-4" strokeWidth={1.75} />
              </span>
              <div>
                <DialogPrimitive.Title className="text-md text-text font-semibold tracking-tight">
                  Register an agent
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-text-muted mt-0.5 text-sm leading-relaxed">
                  A Privy-custodied wallet is provisioned for it. It starts with no budget and no
                  policy, so it cannot spend until you say what it may spend on.
                </DialogPrimitive.Description>
              </div>
            </div>
            <DialogPrimitive.Close className="text-ash-400 hover:bg-ash-50 hover:text-text-secondary -mt-1 -mr-1 inline-flex size-7 cursor-pointer items-center justify-center rounded-md transition-colors duration-(--duration-fast)">
              <X aria-hidden className="size-4" strokeWidth={2} />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          <div className="mt-4">
            <AgentCreateForm />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

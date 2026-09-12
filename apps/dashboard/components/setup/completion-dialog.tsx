'use client';

/**
 * The dialog shown when the guide is finished.
 */

import { ArrowUpRight, BookOpen, PartyPopper, ShoppingBag, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

/** Props for {@link CompletionDialog}. */
export interface CompletionDialogProps {
  /** Whether the guide has just been finished. */
  open: boolean;
  /** Closes it. */
  onOpenChange: (open: boolean) => void;
  /** Where the documentation lives. */
  docsUrl: string;
}

/** Where to go once the guide has nothing left to teach. */
const DESTINATIONS = [
  {
    href: '/marketplace',
    icon: ShoppingBag,
    title: 'Marketplace',
    body: 'Paid resources your agent can buy, with what each one charges.',
  },
  {
    href: '/capabilities',
    icon: Sparkles,
    title: 'Capabilities',
    body: 'The tools your runtime can call, and which of them can spend.',
  },
] as const;

/**
 * Congratulates an operator who has just finished the guide.
 *
 * @remarks Opened by the press that finishes the last step, and by nothing
 * else. It remembers nothing between visits on purpose: the guide is a
 * walkthrough, so finishing it a second time deserves the same reply as the
 * first.
 */
export function CompletionDialog({ open, onOpenChange, docsUrl }: CompletionDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="You are all set"
      description="Every step is done. Your agent has paid for its own data, under limits you wrote."
    >
      <div className="flex flex-col gap-3">
        <div className="border-success-line bg-success-soft flex gap-2.5 rounded-md border p-3">
          <PartyPopper
            aria-hidden
            className="text-success-ink mt-0.5 size-4 shrink-0"
            strokeWidth={2}
          />
          <p className="text-text-secondary text-sm leading-relaxed">
            Nothing else has to be wired up. Anything else your agent buys goes through the same
            budget, the same policy, and the same audit trail.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {DESTINATIONS.map(({ href, icon: Icon, title, body }) => (
            <Link
              key={href}
              href={href}
              onClick={() => {
                onOpenChange(false);
              }}
              className="border-divider hover:border-border hover:bg-ash-50 focus-visible:ring-accent-300 flex items-start gap-2.5 rounded-md border p-2.5 transition-colors duration-(--duration-fast) ease-(--ease-brand) focus-visible:ring-2 focus-visible:outline-none"
            >
              <Icon
                aria-hidden
                className="text-ash-400 mt-0.5 size-4 shrink-0"
                strokeWidth={1.75}
              />
              <span className="min-w-0">
                <span className="text-text block text-sm font-medium">{title}</span>
                <span className="text-text-muted mt-0.5 block text-xs leading-relaxed">{body}</span>
              </span>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" asChild>
            <a href={docsUrl} target="_blank" rel="noreferrer noopener">
              <BookOpen aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
              Read the docs
              <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Back to the guide
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

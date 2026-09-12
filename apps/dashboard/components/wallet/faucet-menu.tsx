'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import Image from 'next/image';

import { cn } from '@/lib/cn';
import { FAUCETS, faucetFor, type Faucet, type FaucetAsset } from '@/lib/faucets';

/** A faucet's mark, at the size the surrounding text is set in. */
function Mark({ faucet, className }: { faucet: Faucet; className?: string }) {
  return (
    <Image
      src={faucet.logo}
      alt=""
      width={32}
      height={32}
      unoptimized
      className={cn('size-4 shrink-0 rounded-full object-contain', className)}
    />
  );
}

/**
 * Both faucets behind one control.
 *
 * @param className Extra classes for the trigger.
 * @remarks A menu rather than two buttons: this sits beside a page's primary
 * action, and three buttons in a row leaves the one that matters competing
 * with two that rarely do. The marks ride on the trigger so the control is
 * recognisable before it is opened, and each entry says what it hands out and
 * what that is for — a faucet nobody has used before is not self-explanatory.
 */
export function FaucetMenu({ className }: { className?: string }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          'border-border bg-surface text-text inline-flex h-9 cursor-pointer items-center gap-2',
          'rounded-md border px-3 text-sm font-medium',
          'transition-colors duration-(--duration-fast) ease-(--ease-brand)',
          'hover:bg-ash-25 data-[state=open]:bg-ash-25',
          'focus-visible:ring-accent-500 focus-visible:ring-2 focus-visible:outline-none',
          className,
        )}
      >
        <span aria-hidden className="flex shrink-0 -space-x-1.5">
          {FAUCETS.map((faucet) => (
            <Mark key={faucet.asset} faucet={faucet} className="ring-surface ring-2" />
          ))}
        </span>
        Faucets
        <ChevronDown aria-hidden className="text-ash-400 size-3.5 shrink-0" strokeWidth={2} />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="border-border bg-surface shadow-e3 overlay-pop z-50 w-[17rem] max-w-[calc(100vw-2rem)] rounded-lg border p-1.5"
        >
          <p className="text-text-muted px-2 py-1.5 text-xs leading-relaxed">
            Testnet funds for an agent wallet. Both open in a new tab.
          </p>
          <DropdownMenu.Separator className="bg-divider my-1 h-px" />
          {FAUCETS.map((faucet) => (
            <DropdownMenu.Item key={faucet.asset} asChild>
              <a
                href={faucet.href}
                target="_blank"
                rel="noreferrer noopener"
                className={cn(
                  'flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2',
                  'text-text-secondary transition-colors duration-(--duration-fast) outline-none',
                  'data-highlighted:bg-ash-50 data-highlighted:text-text',
                )}
              >
                <Mark faucet={faucet} className="mt-0.5" />
                <span className="min-w-0 flex-1">
                  <span className="text-text flex items-center gap-1 text-sm font-medium">
                    {faucet.asset}
                    <span className="text-text-muted font-normal">· {faucet.name}</span>
                    <ArrowUpRight aria-hidden className="text-ash-400 size-3" strokeWidth={2} />
                  </span>
                  <span className="text-text-muted mt-0.5 block text-xs leading-snug">
                    {faucet.purpose}
                  </span>
                </span>
              </a>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * One faucet, as a link with its mark.
 *
 * @param asset What the reader needs right now.
 * @param className Extra classes for the link.
 * @remarks For the places that know which asset is missing. Offering both
 * there would make the reader choose again, having just been told.
 */
export function FaucetLink({ asset, className }: { asset: FaucetAsset; className?: string }) {
  const faucet = faucetFor(asset);
  return (
    <a
      href={faucet.href}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        'border-border bg-surface text-text inline-flex h-9 items-center gap-2',
        'rounded-md border px-3 text-sm font-medium',
        'transition-colors duration-(--duration-fast) ease-(--ease-brand)',
        'hover:bg-ash-25 focus-visible:ring-accent-500 focus-visible:ring-2 focus-visible:outline-none',
        className,
      )}
    >
      <Mark faucet={faucet} />
      {faucet.name} faucet, for {faucet.asset}
      <ArrowUpRight aria-hidden className="text-ash-400 size-3.5 shrink-0" strokeWidth={2} />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

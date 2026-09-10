'use client';

import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/cn';
import type { AdapterMode } from '@/lib/types';

/** One adapter slot, with what it governs and why that matters. */
export interface AdapterSlot {
  key: string;
  /** What the slot is called in the interface. */
  label: string;
  /** What the thing plugged in here actually does. */
  role: string;
  /** How it resolved, or `undefined` when the API could not be reached. */
  mode: AdapterMode | undefined;
}

/** Provider ids as they should read to a person. */
const PROVIDER_NAMES: Record<string, string> = {
  privy: 'Privy',
  hedera: 'Hedera',
  'the-graph': 'The Graph',
  ledger: 'Local ledger',
  mock: 'Deterministic fake',
  open: 'Offline (accepts any token)',
  stub: 'Deterministic fake',
};

/**
 * Renders a provider id for display.
 *
 * @param provider Raw id from the health endpoint.
 * @returns A readable name, falling back to the id itself so an unmapped
 *   provider shows what it is rather than nothing.
 */
function providerName(provider: string): string {
  return PROVIDER_NAMES[provider] ?? provider;
}

/**
 * Live adapter wiring, as a disclosure in the sidebar footer.
 *
 * Closed by default: which vendor is behind each port is reassurance, not
 * navigation, and it should not cost rail height until someone asks. The
 * summary still carries the one fact worth seeing at a glance — whether
 * anything is running on a fake.
 *
 * @param slots Every adapter slot, in the order they should be read.
 */
export function AdapterPanel({ slots }: { slots: readonly AdapterSlot[] }) {
  const [open, setOpen] = useState(false);
  const known = slots.filter((slot) => slot.mode !== undefined);
  const faked = known.filter((slot) => !slot.mode?.live).length;
  const allLive = known.length > 0 && faked === 0;

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className="border-divider border-t">
      <Collapsible.Trigger
        className={cn(
          'group flex w-full items-center gap-2 px-5 py-3 text-left',
          'transition-colors duration-(--duration-fast) ease-(--ease-brand)',
          'hover:bg-ash-25 focus-visible:ring-accent-300 focus-visible:ring-2',
          'focus-visible:-outline-offset-2 focus-visible:outline-none',
        )}
      >
        <span className="eyebrow">Adapters</span>

        <span
          className={cn(
            'text-2xs inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium',
            'ring-1 ring-inset',
            known.length === 0
              ? 'bg-ash-50 text-ash-600 ring-ash-200'
              : allLive
                ? 'bg-success-soft text-success-ink ring-success-line'
                : 'bg-warning-soft text-warning-ink ring-warning-line',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'size-1.5 rounded-full',
              known.length === 0 ? 'bg-ash-400' : allLive ? 'bg-success' : 'bg-warning',
            )}
          />
          {known.length === 0
            ? 'Unknown'
            : allLive
              ? `${String(known.length)} live`
              : `${String(faked)} simulated`}
        </span>

        <ChevronDown
          aria-hidden
          className={cn(
            'text-ash-400 group-hover:text-text-secondary ml-auto size-3.5 shrink-0',
            'transition-transform duration-(--duration-base) ease-(--ease-brand)',
            open && 'rotate-180',
          )}
          strokeWidth={2}
        />
        <span className="sr-only">
          {open ? 'Hide adapter details' : 'Show which provider serves each adapter'}
        </span>
      </Collapsible.Trigger>

      <Collapsible.Content className="collapse-panel">
        <ul className="flex flex-col gap-2.5 px-5 pt-0.5 pb-4">
          {slots.map(({ key, label, role, mode }) => {
            // Liveness comes from the API, never inferred from the provider
            // name: the local ledger fallback is not a live index.
            const live = mode?.live === true;
            return (
              <li key={key} className="flex flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-text text-xs font-medium">{label}</span>
                  <span
                    className={cn(
                      'text-2xs shrink-0 font-medium',
                      live ? 'text-success-ink' : 'text-ash-500',
                    )}
                  >
                    {mode === undefined ? 'Unknown' : providerName(mode.provider)}
                  </span>
                </div>
                <p className="text-text-muted text-2xs leading-relaxed">{role}</p>
                {mode !== undefined && !live ? (
                  <p className="text-warning-ink text-2xs">Simulated — not talking to a vendor.</p>
                ) : null}
              </li>
            );
          })}
        </ul>
        {known.length === 0 ? (
          <p className="text-text-muted text-2xs px-5 pb-4 leading-relaxed">
            The API could not be reached, so no provider can be confirmed.
          </p>
        ) : null}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

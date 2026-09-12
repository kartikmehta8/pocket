'use client';

/**
 * The adapter disclosure itself, as a client component.
 */

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/cn';
import type { AdapterMode } from '@/lib/types';
import { ProviderMark } from '@/components/ui/provider-mark';

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

/** How each provider id should read, and the mark that goes with it. */
const PROVIDERS: Record<string, { name: string; logo: string | null }> = {
  privy: { name: 'Privy', logo: '/logos/privy.png' },
  hedera: { name: 'Hedera', logo: '/logos/hedera.svg' },
  'the-graph': { name: 'The Graph', logo: '/logos/graph.svg' },
  ledger: { name: 'Local ledger', logo: null },
  mock: { name: 'Deterministic fake', logo: null },
  open: { name: 'Offline', logo: null },
  stub: { name: 'Deterministic fake', logo: null },
};

/**
 * Resolves a provider id to how it should be shown.
 *
 * @param provider Raw id from the health endpoint.
 * @returns Its name and mark, falling back to the id itself so an unmapped
 *   provider shows what it is rather than nothing.
 */
function providerFor(provider: string): { name: string; logo: string | null } {
  return PROVIDERS[provider] ?? { name: provider, logo: null };
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
 * @param id Stable identifier for the panel, unique on the page.
 * @remarks The id is passed in rather than generated. This rail is rendered
 *   twice, once fixed and once inside the mobile drawer, and a generated id
 *   is allocated by tree position: the two copies arrive in a different order
 *   on the client than on the server, and the markup fails to hydrate.
 *
 * Liveness comes from the API, never inferred from the provider name: the local
 * ledger fallback is not a live index.
 */
export function AdapterPanel({ slots, id }: { slots: readonly AdapterSlot[]; id: string }) {
  const [open, setOpen] = useState(false);
  const known = slots.filter((slot) => slot.mode !== undefined);
  const faked = known.filter((slot) => !slot.mode?.live).length;
  const allLive = known.length > 0 && faked === 0;

  return (
    <div className="border-divider border-t">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
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
      </button>

      {/* `inert` keeps the collapsed rows out of the tab order and away from a
          screen reader, which `hidden` would do too but a grid animation
          cannot use: an element with `display: none` has no height to animate
          from. */}
      <div id={id} data-open={open} inert={!open} className="collapse-panel">
        <div>
          <ul className="flex flex-col gap-2.5 px-5 pt-0.5 pb-4">
            {slots.map(({ key, label, role, mode }) => {
              const live = mode?.live === true;
              return (
                <li key={key} className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="text-text text-xs font-medium">{label}</span>
                    {mode === undefined ? (
                      <ProviderMark src={null} name="Unknown" className="text-2xs py-0.5" />
                    ) : (
                      <ProviderMark
                        src={providerFor(mode.provider).logo}
                        name={providerFor(mode.provider).name}
                        className={cn('text-2xs py-0.5', live ? '' : 'text-ash-500')}
                      />
                    )}
                  </div>
                  <p className="text-text-muted text-2xs leading-relaxed">{role}</p>
                  {mode !== undefined && !live ? (
                    <p className="text-warning-ink text-2xs">
                      Simulated — not talking to a vendor.
                    </p>
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
        </div>
      </div>
    </div>
  );
}

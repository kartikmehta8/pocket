import { CircleDot, CircleDashed } from 'lucide-react';

import { getHealth } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Hint } from '@/components/ui/tooltip';

/** Adapter slots reported by `GET /v1/health`, with what each one governs. */
const SLOTS = [
  { key: 'wallet', hint: 'Who custodies agent wallets and signs their transactions.' },
  { key: 'chain', hint: 'Where balances are read and settlement receipts are confirmed.' },
  {
    key: 'analytics',
    hint: 'Where spend history is indexed. The ledger fallback reads the local database instead.',
  },
  {
    key: 'market',
    hint: 'Live token pricing. Without it a policy that sets a USD ceiling denies rather than guesses.',
  },
  {
    key: 'identity',
    hint: 'Who verifies dashboard sign-ins. Offline mode accepts any token and is for local use only.',
  },
] as const;

/**
 * Sidebar footer showing which adapters are live and which are mocked.
 * Renders an "unknown" row rather than throwing when the API is unreachable.
 */
export async function AdapterHealth() {
  const result = await getHealth();
  const adapters = result.ok ? result.data.adapters : null;

  return (
    <div className="border-divider border-t px-5 py-4">
      <p className="eyebrow mb-2">Adapters</p>
      <ul className="flex flex-col gap-1.5">
        {SLOTS.map(({ key, hint }) => {
          const mode = adapters?.[key];
          // Liveness comes from the API, never inferred from the provider name:
          // the `ledger` analytics fallback is not a live index.
          const live = mode?.live === true;
          const Icon = live ? CircleDot : CircleDashed;
          return (
            <li key={key} className="flex items-center justify-between gap-2 text-xs">
              <Hint label={hint} side="right">
                <span className="text-text-secondary cursor-help capitalize underline decoration-dotted underline-offset-2">
                  {key}
                </span>
              </Hint>
              <span
                className={cn(
                  'text-2xs inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium ring-1 ring-inset',
                  live
                    ? 'bg-success-soft text-success-ink ring-success-line'
                    : 'bg-ash-50 text-ash-600 ring-ash-200',
                )}
              >
                <Icon aria-hidden className="size-2.5" strokeWidth={2.5} />
                {mode === undefined ? 'Unknown' : live ? 'Live' : mode.provider}
              </span>
            </li>
          );
        })}
      </ul>
      {adapters ? null : (
        <p className="text-2xs text-text-muted mt-2">API unreachable. Showing last known slots.</p>
      )}
    </div>
  );
}

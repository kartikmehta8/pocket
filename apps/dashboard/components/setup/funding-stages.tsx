import { cn } from '@/lib/cn';

/** How far one stage of the funding sequence has got. */
export type StageState = 'now' | 'next' | 'done';

/** Props for {@link FundingStages}. */
export interface FundingStagesProps {
  /** Whether a Hedera account exists for the wallet yet. */
  hasAccount: boolean;
  /** Whether that account exists but has published no key. */
  hollow: boolean;
}

/** One stage, drawn as a numbered marker beside its label. */
function Stage({ n, label, state }: { n: number; label: string; state: StageState }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border text-[0.6875rem] font-semibold',
          state === 'now' && 'border-accent-300 bg-accent-100 text-accent-700',
          state === 'next' && 'border-border bg-surface text-text-muted',
          state === 'done' && 'border-success-line bg-success-soft text-success-ink',
        )}
      >
        {n}
      </span>
      <span
        className={cn(
          'truncate text-sm',
          state === 'now' ? 'text-text font-semibold' : 'text-text-muted font-medium',
        )}
      >
        {label}
        {/* The number and the weight both say where you are, and neither is
            readable aloud. */}
        <span className="sr-only">
          {state === 'done' ? ' — done' : state === 'now' ? ' — do this now' : ' — after that'}
        </span>
      </span>
    </div>
  );
}

/** A hairline between two stages, omitted where a row would wrap anyway. */
function Link() {
  return <span aria-hidden className="bg-ash-300 hidden h-px w-4 shrink-0 sm:block" />;
}

/**
 * The three stages of funding a wallet, and which one is outstanding.
 *
 * @param props Whether the account exists, and whether it has a key.
 * @remarks Three rather than two, because the middle one is invisible and
 * fatal: an account with no published key looks finished and is refused by
 * the faucet. Naming it as a stage is what stops somebody copying an id that
 * will never be paid.
 */
export function FundingStages({ hasAccount, hollow }: FundingStagesProps) {
  return (
    <div className="border-border bg-ash-50 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border px-3 py-2.5">
      <Stage n={1} label="HBAR, to create the account" state={hasAccount ? 'done' : 'now'} />
      <Link />
      <Stage n={2} label="Publish the key" state={hollow ? 'now' : hasAccount ? 'done' : 'next'} />
      <Link />
      <Stage n={3} label="USDC, to spend" state={hasAccount && !hollow ? 'now' : 'next'} />
    </div>
  );
}

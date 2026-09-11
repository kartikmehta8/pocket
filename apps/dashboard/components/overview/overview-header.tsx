import { categoryLabel } from '@/lib/catalog';
import { formatAmount, formatPercentDelta } from '@/lib/format';
import type { Category } from '@/lib/types';

/** One figure in the strip beneath the headline. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-2xs font-medium tracking-wide text-white/60 uppercase">{label}</p>
      <p className="figures mt-0.5 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

/** Props for {@link OverviewHeader}. */
export interface OverviewHeaderProps {
  /** Length of the reporting window, in days. */
  days: number;
  asset: string;
  /** Settled spend across the window, as a decimal string. */
  periodSpend: string;
  /** Change against the previous window of equal length, or `null` when the
   * previous window was empty and a ratio would say nothing. */
  increasePercent: number | null;
  /** Payments attempted across the window. */
  paymentCount: number;
  agentCount: number;
  activeCount: number;
  /** Busiest category over the window, or `null` when nothing settled. */
  largestCategory: Category | null;
}

/**
 * The organization at a glance: what it spent over the window, and how much of
 * it is running.
 *
 * @remarks The blue panel the landing page closes on, and the same one the
 * agent page opens with. It carries the period total rather than today's, so
 * nothing here repeats a tile below it.
 */
export function OverviewHeader({
  days,
  asset,
  periodSpend,
  increasePercent,
  paymentCount,
  agentCount,
  activeCount,
  largestCategory,
}: OverviewHeaderProps) {
  return (
    <header className="border-border bg-accent-600 shadow-pop overflow-hidden rounded-lg border">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Overview</h1>
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-white/75">
            Spend, policy outcomes and agent activity across the last {days} days.
          </p>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-2xs font-medium tracking-wide text-white/60 uppercase">
            Spend · last {days} days
          </p>
          <p className="figures mt-0.5 text-2xl font-bold tracking-tight text-white">
            {formatAmount(periodSpend, asset)}
          </p>
          {increasePercent !== null && Number.isFinite(increasePercent) ? (
            <p className="figures mt-0.5 text-xs text-white/70">
              {formatPercentDelta(increasePercent)} vs previous {days} days
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-white/20 bg-white/5 p-5 sm:grid-cols-4 sm:px-6">
        <Stat label="Payments" value={String(paymentCount)} />
        <Stat label="Agents" value={String(agentCount)} />
        <Stat label="Active" value={`${activeCount} of ${agentCount}`} />
        <Stat
          label="Largest category"
          value={largestCategory === null ? 'None yet' : categoryLabel(largestCategory)}
        />
      </div>
    </header>
  );
}

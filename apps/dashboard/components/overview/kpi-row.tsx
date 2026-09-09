'use client';

import { Ban, CircleCheck, Coins, Gauge } from 'lucide-react';

import { Meter } from '@/components/ui/meter';
import { Stagger, StaggerItem } from '@/components/ui/reveal';
import { StatTile } from '@/components/ui/stat-tile';
import { formatAmount, usageRatio } from '@/lib/format';
import type { Tone } from '@/lib/status';

/** Props for {@link KpiRow}. */
export interface KpiRowProps {
  asset: string;
  /** Spend across the organization today, as a decimal string. */
  spendToday: string;
  /** Sum of every agent's remaining daily allowance, as a decimal string. */
  dailyRemaining: string;
  /** Combined daily limit, used for the remaining-allowance meter. */
  dailyLimit: string;
  settledCount: number;
  blockedCount: number;
  /** Change against the previous window, already formatted. */
  spendDelta?: { text: string; tone: Tone };
}

/**
 * The four numbers the dashboard leads with. Each is a stat tile rather than a
 * one-bar chart, revealed with a short stagger and rolled up from zero.
 */
export function KpiRow({
  asset,
  spendToday,
  dailyRemaining,
  dailyLimit,
  settledCount,
  blockedCount,
  spendDelta,
}: KpiRowProps) {
  // The meter plots the share consumed, so its severity escalates as headroom
  // runs out; the tile's own value states what is left.
  const consumedRatio = usageRatio(spendToday, dailyLimit);

  return (
    <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StaggerItem>
        <StatTile
          label="Spend today"
          value={spendToday}
          unit={asset}
          icon={Coins}
          hint="Settled payments across every agent since midnight UTC, when daily budgets reset."
          {...(spendDelta ? { delta: spendDelta } : {})}
        />
      </StaggerItem>
      <StaggerItem>
        <StatTile
          label="Daily remaining"
          value={dailyRemaining}
          unit={asset}
          icon={Gauge}
          hint="What every agent could still spend today. Payments in flight reserve against this, so it never over-commits."
          footer={
            <Meter
              ratio={consumedRatio}
              label="Share of the combined daily allowance already spent"
              valueText={`${formatAmount(spendToday, null)} of ${formatAmount(dailyLimit, asset)} used`}
            />
          }
        />
      </StaggerItem>
      <StaggerItem>
        <StatTile
          label="Payments settled"
          value={String(settledCount)}
          decimals={0}
          icon={CircleCheck}
          hint="Confirmed on chain in the last 7 days. A true count over the window, not the size of the table below."
        />
      </StaggerItem>
      <StaggerItem>
        <StatTile
          label="Blocked"
          value={String(blockedCount)}
          decimals={0}
          icon={Ban}
          hint="Attempts policy refused. They are kept as rows with a reason, so “why was my agent stopped?” stays answerable."
          {...(blockedCount > 0
            ? { delta: { text: 'Policy stopped these', tone: 'danger' as Tone } }
            : {})}
        />
      </StaggerItem>
    </Stagger>
  );
}

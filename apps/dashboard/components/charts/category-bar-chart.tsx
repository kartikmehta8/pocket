'use client';

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { categoryLabel } from '@/lib/catalog';
import { formatAmount, formatMoney, toPlotNumber } from '@/lib/format';
import type { SpendSummary } from '@/lib/types';

import { CHART, TICK_STYLE } from './chart-tokens';
import { activeDatum, TooltipCard } from './tooltip';

/** One plotted category. */
interface CategoryRow {
  category: string;
  label: string;
  /** Geometry only — the exact decimal lives in `amount`. */
  value: number;
  amount: string;
  count: number;
}

/** Props for {@link CategoryBarChart}. */
export interface CategoryBarChartProps {
  byCategory: SpendSummary['byCategory'];
  asset: string;
}

const ROW_HEIGHT = 30;

/**
 * Spend by category as horizontal bars. Categories are nominal, so every bar
 * wears the same hue — length already encodes magnitude, and a value ramp
 * would burn the only free channel restating it. Every value is direct-labelled
 * at the tip, which is why the chart carries no gridlines at all.
 */
export function CategoryBarChart({ byCategory, asset }: CategoryBarChartProps) {
  const rows: CategoryRow[] = [...byCategory]
    .map((entry) => ({
      category: entry.category,
      label: categoryLabel(entry.category),
      value: toPlotNumber(entry.amount),
      amount: entry.amount,
      count: entry.count,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <ResponsiveContainer width="100%" height={Math.max(rows.length * ROW_HEIGHT + 32, 160)}>
      <BarChart
        data={rows}
        layout="vertical"
        barCategoryGap={2}
        margin={{ top: 4, right: 72, bottom: 4, left: 8 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={{ stroke: CHART.axis }}
          width={104}
        />
        <Tooltip
          cursor={{ fill: 'var(--color-ash-50)' }}
          content={(props: unknown) => {
            const row = activeDatum(props) as CategoryRow | null;
            if (!row) return null;
            return (
              <TooltipCard
                heading={row.label}
                rows={[{ label: 'Spend', value: formatAmount(row.amount, asset) }]}
                footer={`${row.count} payment${row.count === 1 ? '' : 's'}`}
              />
            );
          }}
        />
        <Bar
          dataKey="value"
          fill={CHART.series1}
          barSize={16}
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="amount"
            position="right"
            offset={10}
            fill={CHART.label}
            fontSize={11}
            formatter={(value: unknown) => formatMoney(typeof value === 'string' ? value : '', 2)}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

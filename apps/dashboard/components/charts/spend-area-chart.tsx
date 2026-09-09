'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatAmount, formatDay, formatMoney, toPlotNumber } from '@/lib/format';
import type { Timeseries } from '@/lib/types';

import { CHART, TICK_STYLE } from './chart-tokens';
import { activeDatum, TooltipCard } from './tooltip';

/** One plotted day of spend. */
interface SpendRow {
  date: string;
  /** Geometry only — the exact decimal lives in `amount`. */
  value: number;
  amount: string;
  count: number;
}

/** Props for {@link SpendAreaChart}. */
export interface SpendAreaChartProps {
  points: Timeseries['points'];
  asset: string;
}

/**
 * Endpoint marker: an 8px dot with a 2px surface ring plus the one direct
 * label this chart carries, drawn on the final day only.
 */
function renderEndpoint(props: unknown, lastIndex: number, text: string) {
  const record = (props ?? {}) as Record<string, unknown>;
  const cx = record['cx'];
  const cy = record['cy'];
  const index = typeof record['index'] === 'number' ? record['index'] : 0;
  // Recharts invokes this once per point, so each returned element needs its
  // own key or React warns about a list without keys.
  const key = `endpoint-${index}`;
  if (index !== lastIndex || typeof cx !== 'number' || typeof cy !== 'number') {
    return <g key={key} />;
  }
  return (
    <g key={key}>
      <circle cx={cx} cy={cy} r={4} fill={CHART.series1} stroke={CHART.surface} strokeWidth={2} />
      <text x={cx + 10} y={cy} dy={4} fill={CHART.label} fontSize={11} fontWeight={600}>
        {text}
      </text>
    </g>
  );
}

/**
 * Daily spend over the selected window — one series, so no legend: the card
 * title names what is plotted. A 2px line over a 10% wash, hairline horizontal
 * gridlines, a crosshair tooltip, and a direct label on the final day.
 */
export function SpendAreaChart({ points, asset }: SpendAreaChartProps) {
  const rows: SpendRow[] = points.map((point) => ({
    date: point.date,
    value: toPlotNumber(point.amount),
    amount: point.amount,
    count: point.count,
  }));
  const lastIndex = rows.length - 1;
  const last = rows[lastIndex];

  return (
    <ResponsiveContainer width="100%" height={264}>
      <AreaChart data={rows} margin={{ top: 16, right: 56, bottom: 4, left: 8 }}>
        <CartesianGrid stroke={CHART.grid} strokeWidth={1} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDay}
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={{ stroke: CHART.axis }}
          minTickGap={24}
          dy={4}
        />
        <YAxis
          tickFormatter={(value: number) => formatMoney(String(value), 2)}
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
          width={64}
        />
        <Tooltip
          cursor={{ stroke: CHART.axis, strokeWidth: 1 }}
          content={(props: unknown) => {
            const row = activeDatum(props) as SpendRow | null;
            if (!row) return null;
            return (
              <TooltipCard
                heading={formatDay(row.date)}
                rows={[{ label: 'Spend', value: formatAmount(row.amount, asset) }]}
                footer={`${row.count} payment${row.count === 1 ? '' : 's'}`}
              />
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={CHART.series1}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={CHART.series1}
          fillOpacity={CHART.areaOpacity}
          isAnimationActive={false}
          activeDot={{ r: 4, fill: CHART.series1, stroke: CHART.surface, strokeWidth: 2 }}
          dot={(props: unknown) =>
            renderEndpoint(props, lastIndex, last ? formatMoney(last.amount, 2) : '')
          }
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

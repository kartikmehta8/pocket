'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { CHART, TICK_STYLE } from '@/components/charts/chart-tokens';
import { activeDatum, TooltipCard } from '@/components/charts/tooltip';
import { DAILY_LIMIT, SAMPLE_DAYS, type SampleDay } from './sample-data';

/**
 * Two weeks of one agent's spend, with its daily ceiling drawn across it.
 *
 * A line rather than a filled area: the shape of the variation is the story,
 * and a wash under it adds ink without adding information. The ceiling is a
 * labelled reference line, because the reader should not have to infer it from
 * where the line happens to stop.
 */
export function SpendPreview() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={[...SAMPLE_DAYS]} margin={{ top: 20, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid stroke={CHART.grid} strokeWidth={1} vertical={false} />
        <XAxis
          dataKey="label"
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={{ stroke: CHART.axis }}
          interval={1}
          dy={4}
        />
        <YAxis
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
          width={44}
          domain={[0, DAILY_LIMIT + 0.4]}
          tickFormatter={(value: number) => value.toFixed(2)}
        />
        <ReferenceLine
          y={DAILY_LIMIT}
          stroke={CHART.axis}
          strokeDasharray="5 4"
          label={{
            value: `Your limit  ${DAILY_LIMIT.toFixed(2)}`,
            position: 'insideTopRight',
            fill: CHART.label,
            fontSize: 11,
            fontWeight: 600,
            dy: -8,
          }}
        />
        <Tooltip
          cursor={{ stroke: CHART.axis, strokeWidth: 1 }}
          content={(props: unknown) => {
            const row = activeDatum(props) as SampleDay | null;
            if (!row) return null;
            return (
              <TooltipCard
                heading={row.label}
                rows={[{ label: 'Spend', value: row.spend.toFixed(2) }]}
                footer={`${row.count} purchases`}
              />
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="spend"
          stroke={CHART.series1}
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          animationDuration={1100}
          dot={false}
          activeDot={{ r: 4, fill: CHART.series1, stroke: CHART.surface, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

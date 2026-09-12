/**
 * The spend-by-category composition on the overview.
 */

import { categoryLabel } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { formatAmount, toPlotNumber } from '@/lib/format';
import type { SpendSummary } from '@/lib/types';

/**
 * The theme's chart series slots, in order.
 *
 * @remarks Whole class names rather than an index composed into one at
 * render time: Tailwind scans the source for literal classes, and a token no
 * class name mentions is dropped from the stylesheet, so `bg-series-${n}`
 * would paint nothing from slot two onwards.
 */
const SERIES = [
  'bg-series-1',
  'bg-series-2',
  'bg-series-3',
  'bg-series-4',
  'bg-series-5',
  'bg-series-6',
  'bg-series-7',
  'bg-series-8',
] as const;

/** One category, ranked and measured against the window's total. */
interface Slice {
  category: string;
  label: string;
  /** Geometry only — the exact decimal lives in `amount`. */
  value: number;
  amount: string;
  count: number;
  /** Share of the window's spend, `0..1`. */
  share: number;
  /** Tailwind background class from the series ramp. */
  colour: string;
}

/** Props for {@link CategorySplit}. */
export interface CategorySplitProps {
  byCategory: SpendSummary['byCategory'];
  asset: string;
}

/**
 * Where the money went, as a composition rather than a bar chart.
 *
 * @remarks Categories are parts of one total, so the question the reader has
 * is "how is the spend split", which a single stacked bar answers at a glance
 * and a column per category makes them measure. Each slice is restated in the
 * list beneath with its exact amount and share, so no value is reachable only
 * by hovering and the chart needs no table twin.
 *
 * Plain CSS, no plotting library: there is no axis, no scale and no
 * interaction to get right, and this renders on the server with the page.
 *
 * Hues are seated after ranking, so the largest slice always wears series one
 * and the bar reads darkest-first from the left.
 */
export function CategorySplit({ byCategory, asset }: CategorySplitProps) {
  const ranked = [...byCategory]
    .map((entry) => ({
      category: entry.category,
      label: categoryLabel(entry.category),
      value: toPlotNumber(entry.amount),
      amount: entry.amount,
      count: entry.count,
    }))
    .sort((a, b) => b.value - a.value);

  const total = ranked.reduce((sum, entry) => sum + entry.value, 0);
  const slices: Slice[] = ranked.map((entry, index) => ({
    ...entry,
    share: total > 0 ? entry.value / total : 0,
    colour: SERIES[index % SERIES.length] ?? SERIES[0],
  }));

  return (
    <div className="flex flex-col gap-4">
      {/* Slices with no spend are left out: a zero share still draws a
          hairline of colour, which reads as a category that took money. */}
      <div aria-hidden className="bg-ash-100 flex h-2.5 w-full overflow-hidden rounded-full">
        {slices
          .filter((slice) => slice.share > 0)
          .map((slice) => (
            <div
              key={slice.category}
              className={slice.colour}
              style={{ width: `${slice.share * 100}%` }}
            />
          ))}
      </div>

      <ul className="flex flex-col">
        {slices.map((slice) => (
          <li
            key={slice.category}
            className="border-divider flex items-center gap-3 border-t py-2.5 first:border-t-0"
          >
            <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', slice.colour)} />
            <div className="min-w-0 flex-1">
              <p className="text-text truncate text-sm font-medium">{slice.label}</p>
              <p className="text-text-muted figures text-xs">
                {slice.count} payment{slice.count === 1 ? '' : 's'}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="figures text-text text-sm font-semibold">
                {formatAmount(slice.amount, asset)}
              </p>
              <p className="figures text-text-muted text-xs">
                {Math.round(slice.share * 100)}% of spend
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

'use client';

import { useId, useState } from 'react';
import type { ReactNode } from 'react';

import { Segmented } from '@/components/ui/segmented';

/** Props for {@link ChartFrame}. */
export interface ChartFrameProps {
  title: string;
  /** One line naming what is plotted; a single-series chart needs no legend. */
  subtitle?: string;
  /** The chart itself. */
  children: ReactNode;
  /** The WCAG-clean equivalent — every chart has a table twin. */
  table: ReactNode;
}

const VIEWS = [
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
] as const;

type View = (typeof VIEWS)[number]['value'];

/**
 * Card shell shared by every chart: heading, a chart/table view switch, and a
 * body sized to include the x-axis band so the card never scrolls internally.
 */
export function ChartFrame({ title, subtitle, children, table }: ChartFrameProps) {
  const [view, setView] = useState<View>('chart');
  const bodyId = useId();

  return (
    <section className="bg-surface ring-border flex flex-col rounded-lg ring-1 ring-inset">
      <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-2">
        <div>
          <h2 className="text-md text-text font-semibold tracking-tight">{title}</h2>
          {subtitle ? <p className="text-text-muted mt-0.5 text-sm">{subtitle}</p> : null}
        </div>
        <Segmented
          label={`${title} view`}
          value={view}
          options={VIEWS}
          onValueChange={(next) => setView(next)}
        />
      </div>
      <div id={bodyId} className="px-2 pt-2 pb-4">
        {view === 'chart' ? children : <div className="px-3">{table}</div>}
      </div>
    </section>
  );
}

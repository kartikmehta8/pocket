import type { ReactNode } from 'react';

/**
 * Narrow a Recharts tooltip render argument down to the datum under the
 * cursor. Recharts types this as `unknown`; the row it hands back is the very
 * object the caller put into `data`, so the caller re-asserts its own row type.
 *
 * @param props The value Recharts passes to a `content` render function.
 * @returns The active datum, or `null` when the tooltip is not showing.
 */
export function activeDatum(props: unknown): unknown {
  if (typeof props !== 'object' || props === null) return null;
  const record = props as Record<string, unknown>;
  if (record['active'] !== true) return null;
  const payload = record['payload'];
  if (!Array.isArray(payload) || payload.length === 0) return null;
  const first: unknown = payload[0];
  if (typeof first !== 'object' || first === null) return null;
  return (first as Record<string, unknown>)['payload'] ?? null;
}

/** Props for {@link TooltipCard}. */
export interface TooltipCardProps {
  /** Bold first line, typically the x value. */
  heading: string;
  /** Label/value pairs beneath the heading. */
  rows: Array<{ label: string; value: string }>;
  /** Optional trailing note, e.g. a payment count. */
  footer?: ReactNode;
}

/**
 * The one tooltip surface used by every chart: elevation-3, hairline ring,
 * tabular figures. Tooltips enhance — never gate — a value; the same numbers
 * are reachable in each chart's table view.
 */
export function TooltipCard({ heading, rows, footer }: TooltipCardProps) {
  return (
    <div className="bg-surface shadow-e3 ring-border rounded-md px-3 py-2 ring-1 ring-inset">
      <p className="text-2xs text-text-muted font-semibold tracking-wide uppercase">{heading}</p>
      <dl className="mt-1 space-y-0.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline gap-4">
            <dt className="text-text-secondary text-xs">{row.label}</dt>
            <dd className="figures text-text ml-auto text-xs font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
      {footer ? <p className="text-2xs text-text-muted mt-1">{footer}</p> : null}
    </div>
  );
}

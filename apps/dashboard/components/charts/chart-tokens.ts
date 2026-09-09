/**
 * Chart roles, expressed as references to the CSS custom properties defined in
 * `app/globals.css`. Recharts writes these straight into SVG attributes, so the
 * design tokens stay single-sourced — no hex is repeated in component code.
 */
export const CHART = {
  /** Categorical slot 1, also the default sequential hue. */
  series1: 'var(--color-series-1)',
  /** Wash opacity for a single-series area fill. */
  areaOpacity: 0.1,
  /** Hairline gridlines, one step off the surface. */
  grid: 'var(--color-grid)',
  /** Baseline and axis rules. */
  axis: 'var(--color-axis)',
  /** Muted ink for tick labels. */
  tick: 'var(--color-text-muted)',
  /** Secondary ink for direct labels. */
  label: 'var(--color-text-secondary)',
  /** Chart surface — used for the 2px ring around overlapping markers. */
  surface: 'var(--color-surface)',
} as const;

/** Shared tick label typography for both axes. */
export const TICK_STYLE = {
  fill: CHART.tick,
  fontSize: 11,
  fontVariantNumeric: 'tabular-nums',
} as const;

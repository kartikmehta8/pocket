/**
 * One figure in the blue header a page or an agent opens with.
 */

/** Props for {@link HeaderStat}. */
export interface HeaderStatProps {
  /** What the figure is, set as a micro-label above it. */
  label: string;
  /** The figure itself, already formatted. */
  value: string;
}

/**
 * A label and its figure, painted for a coloured surface.
 *
 * Lives here rather than beside either header because both use it and they are
 * the same object: the strip of numbers a reader checks first. Its colours are
 * fixed white rather than themed, because it only ever sits on the accent fill.
 *
 * @param props The label and the value.
 */
export function HeaderStat({ label, value }: HeaderStatProps) {
  return (
    <div className="min-w-0">
      <p className="text-2xs font-medium tracking-wide text-white/60 uppercase">{label}</p>
      <p className="figures mt-0.5 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

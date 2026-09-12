/**
 * One row of a definition list.
 */

import type { ReactNode } from 'react';

/** Props for {@link Fact}. */
export interface FactProps {
  /** Sentence-case label, no trailing colon. */
  label: string;
  children: ReactNode;
}

/**
 * One row of a definition list: a label and its value, side by side.
 *
 * @remarks Used inside a `<dl>` with `divide-y`, so a panel of facts reads as
 * a small table. The value wraps anywhere, so a long address or URL only
 * lengthens its own row instead of widening whatever holds the list.
 */
export function Fact({ label, children }: FactProps) {
  return (
    <div className="flex items-baseline gap-4 py-2">
      <dt className="text-text-muted w-28 shrink-0 text-xs font-medium">{label}</dt>
      <dd className="text-text min-w-0 flex-1 text-sm leading-snug [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}

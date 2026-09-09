import type { ReactNode } from 'react';

/** Props for {@link PageHeader}. */
export interface PageHeaderProps {
  /** Small uppercase context line above the title. */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Trailing controls, right-aligned on wide viewports. */
  actions?: ReactNode;
}

/** Consistent page masthead: eyebrow, tracking-tight title, description, actions. */
export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
        <h1 className="text-text text-xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-text-muted mt-1 text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/**
 * The placeholder for "nothing here yet" and "this could not be read".
 */

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/** Props for {@link EmptyState}. */
export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Optional action, typically a link or retry button. */
  action?: ReactNode;
  className?: string;
}

/**
 * Calm placeholder for "nothing here yet" and "the API is unreachable" alike.
 * Pages render this instead of throwing when a fetch fails.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 px-6 py-12 text-center',
        className,
      )}
    >
      <span className="bg-ash-50 text-ash-500 ring-border flex size-9 items-center justify-center rounded-full ring-1 ring-inset">
        <Icon aria-hidden className="size-4" strokeWidth={1.75} />
      </span>
      <p className="text-text text-sm font-medium">{title}</p>
      {description ? <p className="text-text-muted max-w-sm text-sm">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

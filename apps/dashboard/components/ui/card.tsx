import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/** Props shared by every card slot. */
interface SlotProps {
  className?: string;
  children?: ReactNode;
}

/** Props for {@link Card}. */
export interface CardProps extends SlotProps {
  /**
   * The hard offset shadow the landing page and the capabilities banner carry,
   * in place of the soft hover lift. For the one or two cards that anchor a
   * page, not for a grid of them.
   */
  pop?: boolean;
}

/**
 * Elevation-1 surface with a hairline ring — the default container for
 * everything on the dashboard.
 */
export function Card({ pop, className, children }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface ring-border rounded-lg ring-1 ring-inset',
        pop
          ? 'shadow-pop'
          : 'hover:shadow-e2 transition-shadow duration-(--duration-base) ease-(--ease-brand)',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Card header row: title, description and optional trailing action. */
export function CardHeader({ className, children }: SlotProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-4 pb-3', className)}>
      {children}
    </div>
  );
}

/** Card title — sentence case, tracking-tight. */
export function CardTitle({ className, children }: SlotProps) {
  return (
    <h2 className={cn('text-md text-text font-semibold tracking-tight', className)}>{children}</h2>
  );
}

/** One-line supporting copy beneath a card title. */
export function CardDescription({ className, children }: SlotProps) {
  return <p className={cn('text-text-muted mt-0.5 text-sm', className)}>{children}</p>;
}

/** Card body with the standard inset. */
export function CardContent({ className, children }: SlotProps) {
  return <div className={cn('px-5 pb-5', className)}>{children}</div>;
}

/** Card footer, separated by a hairline. */
export function CardFooter({ className, children }: SlotProps) {
  return (
    <div className={cn('border-divider text-text-muted border-t px-5 py-3 text-sm', className)}>
      {children}
    </div>
  );
}

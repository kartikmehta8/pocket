import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * A short literal inside running prose — a variable name, a flag, a status.
 *
 * @param children The literal text.
 * @param className Extra classes.
 */
export function InlineCode({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <code
      className={cn(
        'bg-ash-100 text-text-secondary rounded-sm px-1 py-0.5 font-mono text-[0.9em]',
        className,
      )}
    >
      {children}
    </code>
  );
}

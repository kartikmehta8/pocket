import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/cn';

import { Button } from './button';

/** Props for {@link Pager}. */
export interface PagerProps {
  /** Whether the reader is on the first page. */
  onFirstPage: boolean;
  /** Where the first page is. */
  newest: string;
  /** Where the next page is, or `null` on the last one. */
  older: string | null;
  className?: string;
}

/**
 * Footer for a cursor-paged list: back to the newest, on to the older.
 *
 * @remarks A cursor only moves one way, so "older" is the only step forward
 * and "newest" is the way back, which is how such a record is read: from now,
 * backwards, then back to now.
 *
 * The two controls sit together at one end rather than pinned to opposite
 * edges. Pinned, they read as the corners of a bar that has nothing in the
 * middle, and the wider the screen the more obviously so.
 *
 * Renders nothing while everything fits on the first page. The caller owns
 * whatever surrounds it, since this sits inside a table on one page and under
 * a grid of cards on another.
 */
export function Pager({ onFirstPage, newest, older, className }: PagerProps) {
  if (onFirstPage && older === null) return null;

  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-end gap-2', className)}>
      {older === null ? (
        <span className="text-text-muted mr-1 text-xs">Start of the record</span>
      ) : null}
      {onFirstPage ? null : (
        <Button asChild size="sm">
          <Link href={newest}>
            <ArrowLeft aria-hidden className="size-3.5" strokeWidth={2} />
            Newest
          </Link>
        </Button>
      )}
      {older === null ? null : (
        <Button asChild size="sm">
          <Link href={older}>
            Older
            <ArrowRight aria-hidden className="size-3.5" strokeWidth={2} />
          </Link>
        </Button>
      )}
    </nav>
  );
}

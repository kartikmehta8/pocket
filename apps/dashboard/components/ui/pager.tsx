import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from './button';

/** Props for {@link Pager}. */
export interface PagerProps {
  /** The current page, counting from one. */
  page: number;
  /** Where the first page is. */
  newest: string;
  /** Where the next page is, or `null` on the last one. */
  older: string | null;
}

/**
 * Footer for a cursor-paged list: back to the newest, on to the older.
 *
 * @remarks A cursor only moves one way, so "older" is the only step forward
 * and "newest" is the way back, which is how such a record is read: from now,
 * backwards, then back to now. Renders nothing while everything fits on the
 * first page.
 */
export function Pager({ page, newest, older }: PagerProps) {
  if (page <= 1 && older === null) return null;

  return (
    <div className="border-divider flex items-center justify-between gap-2 border-t px-4 py-3">
      {page > 1 ? (
        <Button asChild size="sm">
          <Link href={newest}>
            <ArrowLeft aria-hidden className="size-3.5" strokeWidth={2} />
            Newest
          </Link>
        </Button>
      ) : (
        // Holds the left slot, so "Older" stays on the right on page one.
        <span />
      )}
      {older !== null ? (
        <Button asChild size="sm">
          <Link href={older}>
            Older
            <ArrowRight aria-hidden className="size-3.5" strokeWidth={2} />
          </Link>
        </Button>
      ) : (
        <span className="text-text-muted text-xs">Start of the record</span>
      )}
    </div>
  );
}

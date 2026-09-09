import Link from 'next/link';

import { TAGLINE } from '@/lib/brand';
import { cn } from '@/lib/cn';

/**
 * The Purse wordmark: the name, set tight, and nothing else.
 *
 * No glyph. A one-word product does not need a logo beside its own name, and
 * a generic mark next to it reads as filler.
 *
 * @param href Where the wordmark links.
 * @param tagline Whether to show the one-line description beneath it.
 */
export function Wordmark({
  href = '/dashboard',
  tagline = false,
}: {
  href?: string;
  tagline?: boolean;
}) {
  return (
    <div>
      <Link
        href={href}
        className={cn(
          'text-text inline-flex items-baseline rounded-md text-[0.9375rem] font-semibold',
          'tracking-[-0.03em] transition-opacity duration-(--duration-fast) hover:opacity-70',
        )}
      >
        Purse
        <span aria-hidden className="bg-accent-500 ml-[3px] size-1 self-end rounded-full" />
      </Link>
      {tagline ? <p className="text-text-muted mt-1.5 text-xs leading-snug">{TAGLINE}</p> : null}
    </div>
  );
}

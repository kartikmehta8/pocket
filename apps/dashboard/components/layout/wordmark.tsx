/**
 * The Pocket wordmark.
 */

import Link from 'next/link';

import { cn } from '@/lib/cn';

/**
 * The Pocket wordmark: the name, set tight, and nothing else.
 *
 * No glyph. A one-word product does not need a logo beside its own name, and
 * a generic mark next to it reads as filler.
 *
 * @param href Where the wordmark links.
 */
export function Wordmark({ href = '/dashboard' }: { href?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'text-text inline-flex items-baseline rounded-md text-[0.9375rem] font-semibold',
        'tracking-[-0.03em] transition-opacity duration-(--duration-fast) hover:opacity-70',
      )}
    >
      Pocket
      <span aria-hidden className="bg-accent-500 ml-[3px] size-1 self-end rounded-full" />
    </Link>
  );
}

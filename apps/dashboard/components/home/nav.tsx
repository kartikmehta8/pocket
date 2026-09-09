'use client';

import { BookOpen, Menu, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/cn';
import { DURATION, EASE } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { ScrollLink } from './scroll-link';

/** Where the documentation site is served from. */
const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL ?? 'http://localhost:3001/docs';

/** In-page destinations, in the order they appear down the page. */
const LINKS = [
  { id: 'create', label: 'How it works' },
  { id: 'preview', label: 'What you see' },
] as const;

/**
 * Floating navigation.
 *
 * A centred pill rather than a full-width bar: the page below is a column of
 * bordered surfaces, and a bar spanning the viewport would be the only element
 * that does not sit inside that rhythm.
 *
 * It gains its border and shadow only once the page has scrolled, so at rest it
 * reads as part of the hero instead of a strip pinned over it.
 */
export function FloatingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURATION.slow, ease: EASE }}
        className="pointer-events-auto w-full max-w-3xl"
      >
        <nav
          aria-label="Primary"
          className={cn(
            'bg-surface/90 flex items-center justify-between gap-2 rounded-full py-1.5 pr-1.5 pl-4 backdrop-blur-md',
            'transition-[box-shadow,border-color] duration-(--duration-base) ease-(--ease-brand)',
            scrolled
              ? 'border-border shadow-pop-sm border'
              : 'border border-transparent shadow-none',
          )}
        >
          <Link
            href="/"
            className="text-text inline-flex items-baseline rounded-md text-[0.9375rem] font-bold tracking-[-0.03em] transition-opacity duration-(--duration-fast) hover:opacity-70"
          >
            Pocket
            <span aria-hidden className="bg-accent-600 ml-[3px] size-1 self-end rounded-full" />
          </Link>

          <div className="hidden items-center gap-0.5 md:flex">
            {LINKS.map((link) => (
              <ScrollLink
                key={link.id}
                targetId={link.id}
                className="text-text-secondary hover:bg-ash-100 hover:text-text rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-(--duration-fast)"
              >
                {link.label}
              </ScrollLink>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <Button variant="ghost" asChild className="hidden rounded-full lg:inline-flex">
              <a href={DOCS_URL} target="_blank" rel="noreferrer noopener">
                <BookOpen aria-hidden className="size-3.5" strokeWidth={2} />
                View documentation
              </a>
            </Button>
            <Button variant="ghost" asChild className="hidden rounded-full sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button variant="primary" asChild className="rounded-full">
              <Link href="/login">Start free</Link>
            </Button>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="floating-menu"
              className="border-border hover:bg-ash-100 inline-flex size-9 cursor-pointer items-center justify-center rounded-full border transition-colors duration-(--duration-fast) md:hidden"
            >
              {open ? (
                <X aria-hidden className="size-4" strokeWidth={2} />
              ) : (
                <Menu aria-hidden className="size-4" strokeWidth={2} />
              )}
              <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            </button>
          </div>
        </nav>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              id="floating-menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: DURATION.base, ease: EASE }}
              className="border-border bg-surface shadow-pop-sm mt-2 overflow-hidden rounded-lg border md:hidden"
            >
              <div className="flex flex-col gap-0.5 p-2">
                {LINKS.map((link) => (
                  <ScrollLink
                    key={link.id}
                    targetId={link.id}
                    onNavigate={() => setOpen(false)}
                    className="text-text-secondary hover:bg-ash-100 hover:text-text rounded-md px-3 py-2 text-sm font-medium"
                  >
                    {link.label}
                  </ScrollLink>
                ))}
                <a
                  href={DOCS_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-text-secondary hover:bg-ash-100 hover:text-text rounded-md px-3 py-2 text-sm font-medium"
                >
                  View documentation
                </a>
                <Link
                  href="/login"
                  className="text-text-secondary hover:bg-ash-100 hover:text-text rounded-md px-3 py-2 text-sm font-medium sm:hidden"
                >
                  Sign in
                </Link>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

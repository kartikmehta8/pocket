'use client';

/**
 * One navigation link, marked active the way the product's own rail marks one.
 */

import type * as PageTree from 'fumadocs-core/page-tree';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * One navigation link, marked active the way the product's own rail marks one.
 *
 * The active item is marked three ways that do not depend on each other: an
 * `aria-current` announcement, a weight and colour change, and a rail down its
 * leading edge. Never colour alone.
 *
 * @param item The page this link points at.
 * @remarks The marker is a single shared element that slides between items
 * rather than one per link fading in and out, so the eye follows where it went
 * instead of finding it somewhere new. That is what `layoutId` buys, and it is
 * the reason this replaces the library's own item rather than restyling it:
 * a tint applied per link has nothing to animate from.
 *
 * One `layoutId` is safe here because the sidebar exists once. Fumadocs
 * renders either the fixed rail or the drawer, never both, so there is no
 * second copy to claim the same identity and animate towards.
 */
export function SidebarItem({ item }: { item: PageTree.Item }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const active = pathname === item.url;

  return (
    <Link
      href={item.url}
      aria-current={active ? 'page' : undefined}
      data-active={active}
      className={[
        'group relative flex items-center gap-2.5 rounded-lg py-2 pr-2.5 pl-3 text-sm',
        'transition-colors duration-(--duration-fast) ease-(--ease-brand)',
        'focus-visible:ring-accent-300 focus-visible:ring-2 focus-visible:outline-none',
        active
          ? 'text-accent-700 font-semibold'
          : 'text-fd-foreground/75 hover:bg-fd-muted hover:text-fd-foreground font-medium',
      ].join(' ')}
    >
      {active ? (
        <motion.span
          aria-hidden
          layoutId="docs-nav-active"
          transition={
            reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42, mass: 0.7 }
          }
          className="bg-accent-50 absolute inset-0 rounded-lg"
        >
          <span className="bg-accent-500 absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full" />
        </motion.span>
      ) : null}

      {item.icon}
      <span className="relative truncate">{item.name}</span>
    </Link>
  );
}

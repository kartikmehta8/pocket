'use client';

import {
  Bot,
  LayoutDashboard,
  PlugZap,
  Receipt,
  ScrollText,
  Settings,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/cn';

/** Primary destinations, then the two account-level ones. */
const SECTIONS = [
  {
    label: 'Monitor',
    links: [
      { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { href: '/agents', label: 'Agents', icon: Bot },
      { href: '/payments', label: 'Payments', icon: Receipt },
      { href: '/audit', label: 'Audit', icon: ScrollText },
    ],
  },
  {
    label: 'Transact',
    links: [
      { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
      { href: '/capabilities', label: 'Capabilities', icon: Sparkles },
    ],
  },
  {
    label: 'Account',
    links: [
      { href: '/setup', label: 'Connect agent', icon: PlugZap },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
] as const;

/** Whether `pathname` is inside the section rooted at `href`. */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Primary navigation.
 *
 * The active item is marked three ways that do not depend on each other: an
 * `aria-current` announcement, a weight and colour change, and a rail down its
 * leading edge. Never colour alone.
 *
 * @remarks The rail is a single shared element that slides between items
 * rather than one per link fading in and out, so the eye follows where it went
 * instead of finding it somewhere new. Inside a surface the marker is a tinted
 * fill and a rule, not the black hairline the theme uses around cards — a
 * hard outline on every nav item competes with the content it frames.
 *
 * @param idPrefix Distinguishes this copy's shared-layout element from the
 *   other's. The rail is rendered twice, and two rails claiming the same
 *   layout id would animate as one element sliding between them.
 */
export function Nav({ idPrefix }: { idPrefix: string }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  return (
    <nav aria-label="Primary" className="flex flex-col gap-5 px-3">
      {SECTIONS.map((section) => (
        <div key={section.label} className="flex flex-col gap-px">
          <p className="eyebrow px-3 pb-1.5">{section.label}</p>
          {section.links.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-2.5 rounded-lg py-2 pr-2.5 pl-3 text-sm',
                  'transition-colors duration-(--duration-fast) ease-(--ease-brand)',
                  'focus-visible:ring-accent-300 focus-visible:ring-2 focus-visible:outline-none',
                  active
                    ? 'text-accent-700 font-semibold'
                    : 'text-text-secondary hover:bg-ash-50 hover:text-text font-medium',
                )}
              >
                {active ? (
                  <motion.span
                    aria-hidden
                    layoutId={`${idPrefix}-nav-active`}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 520, damping: 42, mass: 0.7 }
                    }
                    className="bg-accent-50 absolute inset-0 rounded-lg"
                  >
                    <span className="bg-accent-500 absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full" />
                  </motion.span>
                ) : null}

                <Icon
                  aria-hidden
                  className={cn(
                    'relative size-4 shrink-0 transition-colors duration-(--duration-fast)',
                    active ? 'text-accent-600' : 'text-ash-400 group-hover:text-ash-600',
                  )}
                  strokeWidth={active ? 2 : 1.75}
                />
                <span className="relative truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

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
import { motion } from 'motion/react';
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
 * The active item is marked by a filled surface, an `aria-current`
 * announcement, and a shared layout element that slides between items — never
 * by colour alone.
 */
export function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex flex-col gap-4 px-3">
      {SECTIONS.map((section) => (
        <div key={section.label} className="flex flex-col gap-0.5">
          <p className="eyebrow px-2.5 pb-1">{section.label}</p>
          {section.links.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium',
                  'transition-colors duration-(--duration-fast) ease-(--ease-brand)',
                  active ? 'text-text' : 'text-text-secondary hover:bg-ash-100 hover:text-text',
                )}
              >
                {active ? (
                  <motion.span
                    aria-hidden
                    layoutId="nav-active"
                    transition={{ type: 'spring', stiffness: 460, damping: 38 }}
                    className="bg-accent-100 ring-border absolute inset-0 rounded-md ring-1 ring-inset"
                  />
                ) : null}
                <Icon
                  aria-hidden
                  className={cn(
                    'relative size-4 shrink-0 transition-colors duration-(--duration-fast)',
                    active ? 'text-accent-600' : 'text-ash-500',
                  )}
                  strokeWidth={1.75}
                />
                <span className="relative">{label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

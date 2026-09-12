/**
 * The testnet faucets, in the sidebar footer.
 */

import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';

import { FAUCETS } from '@/lib/faucets';

/**
 * The two testnet faucets, as a block in the sidebar footer.
 *
 * @remarks It sits in the chrome rather than on a page because the question it
 * answers — "where do I get test money?" — arrives while the reader is part
 * way through something else, and sending them to look for a page about
 * funding is how a five-minute setup becomes twenty.
 *
 * The rule above it is dropped in the drawer the sidebar becomes below `md`,
 * which has an edge of its own and needs no second one inside it.
 *
 * Both links open in a new tab. A faucet is a detour, not a destination, and
 * losing the page you were reading to take one is its own small annoyance.
 */
export function SidebarFaucets() {
  return (
    <div className="border-fd-border/15 flex flex-col gap-1 border-t px-1 pt-3 pb-1 max-md:border-t-0">
      <p className="text-fd-muted-foreground px-2 text-[0.6875rem] font-semibold tracking-[0.07em] uppercase">
        Testnet faucets
      </p>
      {FAUCETS.map((faucet) => (
        <a
          key={faucet.asset}
          href={faucet.href}
          target="_blank"
          rel="noreferrer noopener"
          className="group hover:bg-fd-accent flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors"
        >
          <Image
            src={faucet.logo}
            alt=""
            width={32}
            height={32}
            className="size-5 shrink-0 rounded-full object-contain"
          />
          <span className="flex min-w-0 flex-col">
            <span className="text-fd-foreground text-[0.8125rem] leading-tight font-medium">
              {faucet.asset}
              <span className="text-fd-muted-foreground font-normal"> · {faucet.name}</span>
            </span>
            <span className="text-fd-muted-foreground truncate text-[0.6875rem] leading-tight">
              {faucet.purpose}
            </span>
          </span>
          <ArrowUpRight
            aria-hidden
            className="text-fd-muted-foreground ml-auto size-3.5 shrink-0"
            strokeWidth={2}
          />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ))}
    </div>
  );
}

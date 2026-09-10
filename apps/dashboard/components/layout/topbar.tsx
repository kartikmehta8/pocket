import { BookOpen, CircleHelp, Rocket } from 'lucide-react';
import Link from 'next/link';

import { getOrg } from '@/lib/api';
import { serviceUrls } from '@/lib/urls';
import { cn } from '@/lib/cn';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Rail } from '@/components/layout/rail';
import { SessionSync } from '@/components/auth/session-sync';
import { UserMenu } from '@/components/auth/user-menu';
import { Hint } from '@/components/ui/tooltip';

/** Shared styling for the two chrome links, so they read as one pair. */
const CHROME_LINK = cn(
  'text-text-secondary hover:bg-ash-100 hover:text-text inline-flex items-center gap-1.5',
  'rounded-md px-2.5 py-1.5 text-sm font-medium',
  'transition-colors duration-(--duration-fast) ease-(--ease-brand)',
  'focus-visible:ring-accent-300 focus-visible:ring-2 focus-visible:outline-none',
);

/**
 * Top bar: the reference links and the account menu.
 *
 * @remarks Reads the account server-side on every request, so a rename from
 * settings is reflected without a client-side store to keep in step. The
 * organization is named once, in the account menu; printing it on the left as
 * well said the same thing twice across a few inches of empty bar.
 */
export async function Topbar() {
  const result = await getOrg();
  const org = result.ok ? result.data.org : null;
  const email = result.ok ? (result.data.user?.email ?? null) : null;
  const machine = result.ok && result.data.principal === 'api-key';
  const urls = serviceUrls();

  return (
    <header className="border-border bg-canvas/80 sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b px-5 backdrop-blur-md sm:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav>
          <Rail idPrefix="drawer" />
        </MobileNav>
        {machine ? (
          <Hint label="This dashboard is authenticated with an organization API key rather than a signed-in account. Sign-in features such as key management are unavailable.">
            <span className="bg-warning-soft text-warning-ink ring-warning-line text-2xs inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ring-1 ring-inset">
              <CircleHelp aria-hidden className="size-3" strokeWidth={2.25} />
              API key mode
            </span>
          </Hint>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        <Hint label="Reference: concepts, the API contract, and every MCP tool an agent can call.">
          <a
            href={urls.docs}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(CHROME_LINK, 'hidden sm:inline-flex')}
          >
            <BookOpen aria-hidden className="size-4" strokeWidth={1.75} />
            Documentation
          </a>
        </Hint>

        <Hint label="Step by step: register an agent, fund its wallet, and point your agent runtime at the MCP server.">
          <Link href="/setup" className={cn(CHROME_LINK, 'hidden sm:inline-flex')}>
            <Rocket aria-hidden className="size-4" strokeWidth={1.75} />
            Setup guide
          </Link>
        </Hint>

        {machine ? null : <SessionSync />}
        <UserMenu orgName={org?.name ?? 'Pocket'} email={email} />
      </div>
    </header>
  );
}

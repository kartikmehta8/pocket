import { getOrg } from '@/lib/api';
import { SessionSync } from '@/components/auth/session-sync';
import { UserMenu } from '@/components/auth/user-menu';
import { Hint } from '@/components/ui/tooltip';
import { CircleHelp } from 'lucide-react';
import Link from 'next/link';

/**
 * Top bar: which organization is in view, and the account menu.
 *
 * @remarks Reads the account server-side on every request, so a rename from
 * settings is reflected without a client-side store to keep in step.
 */
export async function Topbar() {
  const result = await getOrg();
  const org = result.ok ? result.data.org : null;
  const email = result.ok ? (result.data.user?.email ?? null) : null;
  const machine = result.ok && result.data.principal === 'api-key';

  return (
    <header className="border-border bg-canvas/80 sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b px-5 backdrop-blur-md sm:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-text truncate text-sm font-medium">{org?.name ?? 'Purse'}</span>
        {machine ? (
          <Hint label="This dashboard is authenticated with an organization API key rather than a signed-in account. Sign-in features such as key management are unavailable.">
            <span className="bg-warning-soft text-warning-ink ring-warning-line text-2xs inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ring-1 ring-inset">
              <CircleHelp aria-hidden className="size-3" strokeWidth={2.25} />
              API key mode
            </span>
          </Hint>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Hint label="Step-by-step setup: register an agent, fund its wallet, and point a Hermes agent at your MCP server.">
          <Link
            href="/setup"
            className="text-text-secondary hover:bg-ash-100 hover:text-text hidden rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors duration-(--duration-fast) sm:block"
          >
            Setup guide
          </Link>
        </Hint>
        {machine ? null : <SessionSync />}
        <UserMenu orgName={org?.name ?? 'Purse'} email={email} />
      </div>
    </header>
  );
}

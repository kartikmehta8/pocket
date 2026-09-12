import { Bot } from 'lucide-react';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AgentCreateDialog } from '@/components/agents/agent-create-dialog';
import { FaucetMenu } from '@/components/wallet/faucet-menu';
import { AgentsBrowser } from '@/components/agents/agents-browser';
import { ApiErrorState } from '@/components/ui/api-error';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { readParam, type SearchParams } from '@/lib/search-params';
import { listAgents } from '@/lib/api';
import { AGENT_STATUSES } from '@/lib/catalog';
import type { AgentStatus } from '@/lib/types';

/** Agent state changes constantly; never prerender this route. */
export const dynamic = 'force-dynamic';

/** Tab title, and the card a shared link renders. */
export const metadata: Metadata = {
  title: 'Agents',
  description: "Every agent holding a Pocket wallet, with today's spend against its daily budget.",
};

/**
 * How many agents one page holds.
 *
 * @remarks Twelve fills the grid exactly at every breakpoint: four rows of
 * three on a wide screen, six of two on a tablet, twelve on a phone.
 */
const PAGE_LIMIT = 12;

/** Narrow a raw query value to a contract agent status. */
function readStatus(value: string): AgentStatus | undefined {
  return AGENT_STATUSES.find((status) => status === value);
}

/**
 * Agents index: every agent with its status, wallet, budget usage and spend.
 *
 * @remarks Filters and the cursor live in the URL, so any view can be shared
 * and the browser's back button walks the pages. An unknown status in a stale
 * link is ignored rather than forwarded to an API that would refuse it.
 */
export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const status = readStatus(readParam(params['status']));
  const search = readParam(params['q']).trim();
  const cursor = readParam(params['cursor']);

  const result = await listAgents({
    limit: PAGE_LIMIT,
    ...(cursor === '' ? {} : { cursor }),
    ...(status ? { status } : {}),
    ...(search === '' ? {} : { q: search }),
  });

  // An empty organization is not the same as a filter that matched nothing,
  // and the two want different things said to them.
  const unfiltered = status === undefined && search === '' && cursor === '';

  return (
    <>
      <PageHeader
        title="Agents"
        description="Every agent holding a Pocket wallet, with today's spend against its daily budget."
        actions={
          <>
            <FaucetMenu />
            <AgentCreateDialog />
          </>
        }
      />
      {!result.ok ? (
        <ApiErrorState subject="agents" code={result.code} message={result.message} />
      ) : result.data.agents.length === 0 && unfiltered ? (
        <div className="bg-surface border-border overflow-hidden rounded-lg border">
          <EmptyState
            icon={Bot}
            title="No agents yet"
            description="Register one to provision its wallet. It starts unable to spend, which is the point. You decide what it may buy."
          />
        </div>
      ) : (
        <Suspense fallback={null}>
          <AgentsBrowser
            agents={result.data.agents}
            status={status ?? ''}
            search={search}
            nextCursor={result.data.nextCursor ?? null}
          />
        </Suspense>
      )}
    </>
  );
}

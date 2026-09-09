import { Bot } from 'lucide-react';
import type { Metadata } from 'next';

import { AgentCreateDialog } from '@/components/agents/agent-create-dialog';
import { AgentsGrid } from '@/components/agents/agents-grid';
import { ApiErrorState } from '@/components/ui/api-error';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { listAgents } from '@/lib/api';

/** Agent state changes constantly; never prerender this route. */
export const dynamic = 'force-dynamic';

/** Tab title for the agents index. */
export const metadata: Metadata = { title: 'Agents' };

/** Agents index: every agent with its status, wallet, budget usage and spend. */
export default async function AgentsPage() {
  const result = await listAgents();

  return (
    <>
      <PageHeader
        eyebrow="Fleet"
        title="Agents"
        description="Every autonomous agent holding a Pocket wallet, with today's spend against its daily budget."
        actions={<AgentCreateDialog />}
      />
      {!result.ok ? (
        <ApiErrorState subject="agents" code={result.code} message={result.message} />
      ) : result.data.agents.length === 0 ? (
        <Card>
          <EmptyState
            icon={Bot}
            title="No agents yet"
            description="Register one to provision its wallet. It starts unable to spend, which is the point. You decide what it may buy."
          />
        </Card>
      ) : (
        <AgentsGrid agents={result.data.agents} />
      )}
    </>
  );
}

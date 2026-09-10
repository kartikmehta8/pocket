import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { getAgent, listAgents, listApiKeys, listPayments } from '@/lib/api';
import { serviceUrls } from '@/lib/urls';
import { hasAmount } from '@/lib/format';
import type { AgentDetail } from '@/lib/types';
import { SetupSteps } from '@/components/setup/setup-steps';
import { type StepState } from '@/components/setup/step';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';

/** Tab title for the setup guide. */
export const metadata: Metadata = { title: 'Connect an agent' };

/** Live state decides which steps show as done, so nothing is prerendered. */
export const dynamic = 'force-dynamic';

/**
 * How many agents to inspect when deciding how far setup has got.
 *
 * @remarks A bound, because each one costs a chain read. Someone with more
 * agents than this is long past needing this page.
 */
const FLEET_SAMPLE = 8;

/**
 * How many of the per-agent steps an agent satisfies.
 *
 * @param detail An agent's detail, or `null`.
 * @returns A count used only to pick which agent this page should follow.
 */
function progress(detail: AgentDetail | null): number {
  if (detail === null) return -1;
  return (
    (hasAmount(detail.balance?.amount) ? 1 : 0) +
    (detail.agent.budget != null ? 1 : 0) +
    (detail.policy != null ? 1 : 0)
  );
}

/**
 * Setup: seven steps from an empty organization to a settled payment.
 *
 * @remarks Every step's completion is read from live state rather than a
 * remembered click, so returning to this page shows how far you actually got.
 * Two of them have no direct signal, so they read one honestly: a runtime that
 * has reached Pocket at all proves it is connected, even if policy refused the
 * attempt, and only a settlement proves a purchase.
 */
export default async function SetupPage() {
  const [agentsResult, keysResult, paymentsResult] = await Promise.all([
    listAgents(),
    listApiKeys(),
    listPayments({ limit: 50 }),
  ]);

  const agents = agentsResult.ok ? agentsResult.data.agents : [];

  // Whichever agent is furthest along, not simply the first one registered.
  // Funding the second agent and watching step two stay unticked is the kind
  // of thing that reads as a broken page rather than a wrong guess.
  const details = await Promise.all(
    agents.slice(0, FLEET_SAMPLE).map(async (candidate) => {
      const result = await getAgent(candidate.id);
      return result.ok ? result.data : null;
    }),
  );
  const detail = details.reduce<AgentDetail | null>(
    (best, candidate) => (progress(candidate) > progress(best) ? candidate : best),
    null,
  );
  const agent = detail?.agent ?? agents[0] ?? null;

  // Key management needs a signed-in person. In API-key mode the call is
  // refused, which is not an error worth showing: the step explains why.
  const keys = keysResult.ok ? keysResult.data.keys.filter((key) => key.revokedAt === null) : [];
  const payments = paymentsResult.ok ? paymentsResult.data.payments : [];
  const urls = serviceUrls();
  const resource = urls.paidService ?? 'http://localhost:8402';

  const reached = [
    agent !== null,
    hasAmount(detail?.balance?.amount),
    detail?.agent.budget != null,
    detail?.policy != null,
    keys.length > 0,
    payments.some((payment) => payment.initiatedBy === 'agent'),
    payments.some((payment) => payment.status === 'settled'),
  ];
  const total = reached.length;
  const next = reached.indexOf(false);

  /** Resolves one step's state from the run as a whole. */
  const stateOf = (position: number): StepState =>
    reached[position] === true ? 'done' : position === next ? 'current' : 'todo';

  return (
    <div className="gap-section flex w-full max-w-3xl flex-col">
      <PageHeader
        title="Connect an agent"
        description="Seven steps from an empty organization to an agent that has paid for its own data."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/agents">
              Agents
              <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
            </Link>
          </Button>
        }
      />

      <SetupSteps
        agent={agent}
        detail={detail}
        keysAvailable={keysResult.ok}
        liveKeys={keys.length}
        mcpUrl={urls.mcp}
        resource={resource}
        stateOf={stateOf}
        total={total}
      />
    </div>
  );
}

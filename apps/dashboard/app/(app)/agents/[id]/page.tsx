import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AgentHeader } from '@/components/agents/agent-header';
import { BudgetEditor } from '@/components/agents/budget-editor';
import { PolicyEditor } from '@/components/agents/policy-editor';
import { TaskBudgets } from '@/components/agents/task-budgets';
import { PaymentsTable } from '@/components/payments/payments-table';
import { ApiErrorState } from '@/components/ui/api-error';
import { Button } from '@/components/ui/button';
import { getAgent, listAgents, listPayments } from '@/lib/api';

/** Agent detail reflects live budget and policy state on every request. */
export const dynamic = 'force-dynamic';

/** Route params, awaited as Next 15 requires. */
interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * Tab title and link preview for one agent.
 *
 * @param props Route params.
 * @returns The agent's own name, or a neutral title when it cannot be read —
 *   a failed lookup must not put an identifier in a browser tab.
 */
export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getAgent(id);
  if (!result.ok) return { title: 'Agent' };
  const { agent } = result.data;
  return {
    title: agent.name,
    description:
      agent.description ?? `Wallet, budget, policy and payment history for ${agent.name}.`,
  };
}

/**
 * Agent detail: status, wallet and balance, budget, the full policy document,
 * task budgets, and this agent's payment history.
 */
export default async function AgentDetailPage({ params }: RouteProps) {
  const { id } = await params;
  const [detailResult, paymentsResult, agentsResult] = await Promise.all([
    getAgent(id),
    listPayments({ agentId: id, limit: 30 }),
    listAgents(),
  ]);

  if (!detailResult.ok) {
    if (detailResult.code === 'HTTP_404' || detailResult.code === 'AGENT_NOT_FOUND') notFound();
    return (
      <ApiErrorState subject="this agent" code={detailResult.code} message={detailResult.message} />
    );
  }

  const detail = detailResult.data;
  // An agent with no policy row cannot spend at all: the engine denies by
  // default. The editor renders empty so an operator can set the first one.
  const asset = detail.agent.budget?.asset ?? detail.policy?.allowedAssets[0] ?? 'USDC';
  // Somewhere to move funds to before this agent is deleted. Revoked agents
  // are left out: money moved into one is stranded just as surely. A failed
  // listing is not an empty one, but it reads as one here, and the dialog then
  // says there is nowhere to move to — the safe thing to be wrong about.
  const others = (agentsResult.ok ? agentsResult.data.agents : []).filter(
    (other) => other.id !== detail.agent.id && other.status !== 'revoked',
  );

  return (
    <>
      <AgentHeader detail={detail} others={others} />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <BudgetEditor agentId={detail.agent.id} budget={detail.agent.budget} />
          <PolicyEditor agentId={detail.agent.id} policy={detail.policy} />
        </div>
        {/* Follows a long policy form down the page rather than leaving a
            column of empty space beside it. */}
        <div className="xl:sticky xl:top-20">
          <TaskBudgets
            agentId={detail.agent.id}
            taskBudgets={detail.taskBudgets}
            defaultAsset={asset}
          />
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-text text-md font-semibold tracking-tight">Payments</h2>
          <p className="text-text-muted mt-0.5 text-sm">
            This agent&rsquo;s most recent attempts, including the ones policy stopped.
          </p>
        </div>
        {paymentsResult.ok ? (
          <div className="bg-surface border-border overflow-hidden rounded-lg border">
            <PaymentsTable
              payments={paymentsResult.data.payments}
              showAgent={false}
              emptyTitle="This agent has not attempted a payment"
            />
            {paymentsResult.data.nextCursor === null ? null : (
              <div className="border-divider flex justify-end border-t px-4 py-3">
                <Button asChild size="sm">
                  <Link href={`/payments?agentId=${encodeURIComponent(detail.agent.id)}`}>
                    All payments
                    <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <ApiErrorState
            subject="payments"
            code={paymentsResult.code}
            message={paymentsResult.message}
          />
        )}
      </section>
    </>
  );
}

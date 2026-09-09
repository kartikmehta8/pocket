import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AgentHeader } from '@/components/agents/agent-header';
import { BudgetEditor } from '@/components/agents/budget-editor';
import { PaymentPreview } from '@/components/agents/payment-preview';
import { PolicyEditor } from '@/components/agents/policy-editor';
import { TaskBudgets } from '@/components/agents/task-budgets';
import { PaymentsTable } from '@/components/payments/payments-table';
import { ApiErrorState } from '@/components/ui/api-error';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAgent, listPayments } from '@/lib/api';

/** Agent detail reflects live budget and policy state on every request. */
export const dynamic = 'force-dynamic';

/** Route params, awaited as Next 15 requires. */
interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * Tab title for one agent.
 *
 * @param props Route params.
 */
export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getAgent(id);
  return { title: result.ok ? result.data.agent.name : 'Agent' };
}

/**
 * Agent detail: status, wallet and balance, budget, the full policy document,
 * task budgets, a policy dry-run, and this agent's payment history.
 */
export default async function AgentDetailPage({ params }: RouteProps) {
  const { id } = await params;
  const [detailResult, paymentsResult] = await Promise.all([
    getAgent(id),
    listPayments({ agentId: id, limit: 100 }),
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
  const chain = detail.agent.wallet?.chain ?? detail.policy?.allowedChains[0] ?? 'hedera-testnet';

  return (
    <>
      <AgentHeader detail={detail} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <BudgetEditor agentId={detail.agent.id} budget={detail.agent.budget} />
          <PolicyEditor agentId={detail.agent.id} policy={detail.policy} />
        </div>
        <TaskBudgets
          agentId={detail.agent.id}
          taskBudgets={detail.taskBudgets}
          defaultAsset={asset}
        />
      </div>

      <PaymentPreview agentId={detail.agent.id} defaultAsset={asset} defaultChain={chain} />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Payments</CardTitle>
            <CardDescription>Every payment this agent has attempted, newest first.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {paymentsResult.ok ? (
            <PaymentsTable
              payments={paymentsResult.data.payments}
              showAgent={false}
              emptyTitle="This agent has not attempted a payment"
            />
          ) : (
            <ApiErrorState
              subject="payments"
              code={paymentsResult.code}
              message={paymentsResult.message}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}

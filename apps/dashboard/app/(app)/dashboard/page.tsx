import { BarChart3, Unplug } from 'lucide-react';

import { CategorySplit } from '@/components/charts/category-split';
import { SpendAreaChart } from '@/components/charts/spend-area-chart';
import { AnomaliesPanel } from '@/components/overview/anomalies-panel';
import { KpiRow } from '@/components/overview/kpi-row';
import { OnboardingBanner } from '@/components/overview/onboarding-banner';
import { PaymentsTable } from '@/components/payments/payments-table';
import { ApiErrorState } from '@/components/ui/api-error';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import {
  getPaymentStats,
  getSpendSummary,
  getTimeseries,
  listAgents,
  listPayments,
} from '@/lib/api';
import { formatAmount, formatPercentDelta, hasAmount, sumMoney } from '@/lib/format';

/** Overview reads live state on every request; nothing here is prerendered. */
export const dynamic = 'force-dynamic';

/**
 * The reporting window every panel on this page shares.
 *
 * @remarks One window, stated once, so the reader never has to work out which
 * figure covers which span. The series used to run over fourteen days while
 * every counter beside it ran over seven.
 */
const WINDOW_DAYS = 7;

/** How many recent payments fill the table below. Counters do not use this. */
const RECENT_LIMIT = 50;

/**
 * What a panel shows when its own fetch failed, as opposed to coming back
 * empty.
 *
 * @remarks The distinction matters: "no spend recorded yet" is a different
 * statement from "the analytics service did not answer", and only one of them
 * should be made when the service did not answer.
 */
function Unavailable({ subject, message }: { subject: string; message: string }) {
  return <EmptyState icon={Unplug} title={`Could not load ${subject}`} description={message} />;
}

/**
 * Overview: the organization's headline numbers, spend over time, spend by
 * category, anomalies, and the most recent payments.
 */
export default async function OverviewPage() {
  const [agentsResult, summaryResult, seriesResult, paymentsResult, statsResult] =
    await Promise.all([
      listAgents(),
      getSpendSummary({ days: WINDOW_DAYS }),
      getTimeseries({ days: WINDOW_DAYS }),
      listPayments({ limit: RECENT_LIMIT }),
      getPaymentStats({ days: WINDOW_DAYS }),
    ]);

  if (!agentsResult.ok && !summaryResult.ok && !paymentsResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Organization"
          title="Overview"
          description={`Spend, policy outcomes and agent activity across the last ${WINDOW_DAYS} days.`}
        />
        <ApiErrorState
          subject="the dashboard"
          code={agentsResult.code}
          message={agentsResult.message}
        />
      </>
    );
  }

  const agents = agentsResult.ok ? agentsResult.data.agents : [];
  const summary = summaryResult.ok ? summaryResult.data : null;
  const payments = paymentsResult.ok ? paymentsResult.data.payments : [];
  // Real counts over the window, so the tiles do not plateau at a page size.
  const stats = statsResult.ok ? statsResult.data : null;

  const asset = summary?.currency ?? agents[0]?.budget?.asset ?? 'USDC';
  const spendToday = sumMoney(agents.map((agent) => agent.spend.today));
  const dailyRemaining = sumMoney(agents.map((agent) => agent.spend.dailyRemaining));
  const dailyLimit = sumMoney(agents.map((agent) => agent.budget?.dailyLimit));

  return (
    <>
      <PageHeader
        eyebrow="Organization"
        title="Overview"
        description={`Spend, policy outcomes and agent activity across the last ${WINDOW_DAYS} days.`}
      />

      <OnboardingBanner
        hasAgent={agents.length > 0}
        hasPolicy={agents.some((agent) => agent.budget !== null)}
        hasPayment={(stats?.settled ?? 0) > 0}
      />

      <KpiRow
        asset={asset}
        spendToday={spendToday}
        dailyRemaining={dailyRemaining}
        dailyLimit={dailyLimit}
        settledCount={stats?.settled ?? 0}
        blockedCount={stats?.blocked ?? 0}
        {...(summary && Number.isFinite(summary.increasePercent)
          ? {
              spendDelta: {
                text: `${formatPercentDelta(summary.increasePercent)} vs previous ${WINDOW_DAYS} days`,
                tone: summary.increasePercent > 0 ? ('warning' as const) : ('success' as const),
              },
            }
          : {})}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Spend over time</CardTitle>
              <CardDescription>
                Daily settled spend in {seriesResult.ok ? seriesResult.data.asset : asset}, last{' '}
                {WINDOW_DAYS} days
              </CardDescription>
            </div>
          </CardHeader>
          {/* The chart carries its own axis padding, so the body is inset less
              than a card body would be and the plot keeps its full width. */}
          <CardContent className="px-2 pb-4">
            {!seriesResult.ok ? (
              <Unavailable subject="the spend series" message={seriesResult.message} />
            ) : seriesResult.data.points.some((point) => hasAmount(point.amount)) ? (
              <SpendAreaChart points={seriesResult.data.points} asset={seriesResult.data.asset} />
            ) : (
              <EmptyState
                icon={BarChart3}
                title="No spend recorded yet"
                description="The series fills in once agents start settling payments."
              />
            )}
          </CardContent>
        </Card>

        <AnomaliesPanel
          anomalies={summary?.anomalies ?? []}
          source={summary?.source ?? 'analytics'}
        />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Spend by category</CardTitle>
            <CardDescription>
              How the last {WINDOW_DAYS} days of spend divide across what agents bought
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {!summaryResult.ok ? (
            <Unavailable subject="the category split" message={summaryResult.message} />
          ) : summaryResult.data.byCategory.length > 0 ? (
            <CategorySplit
              byCategory={summaryResult.data.byCategory}
              asset={summaryResult.data.currency}
            />
          ) : (
            <EmptyState
              icon={BarChart3}
              title="No categorised spend yet"
              description="Categories appear once payments settle."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent payments</CardTitle>
            <CardDescription>
              {payments.length > 0
                ? `${payments.length} most recent · ${formatAmount(sumMoney(payments.map((p) => p.amount)), asset)} attempted`
                : 'Nothing has been attempted yet'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <PaymentsTable payments={payments.slice(0, 12)} />
        </CardContent>
      </Card>
    </>
  );
}

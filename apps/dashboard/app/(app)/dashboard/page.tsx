import {
  getPaymentStats,
  getSpendSummary,
  getTimeseries,
  listAgents,
  listPayments,
} from '@/lib/api';
import { formatAmount, formatPercentDelta, sumMoney } from '@/lib/format';
import { CategoryBarChart } from '@/components/charts/category-bar-chart';
import { ChartFrame } from '@/components/charts/chart-frame';
import { ChartTable } from '@/components/charts/chart-table';
import { SpendAreaChart } from '@/components/charts/spend-area-chart';
import { AnomaliesPanel } from '@/components/overview/anomalies-panel';
import { KpiRow } from '@/components/overview/kpi-row';
import { OnboardingBanner } from '@/components/overview/onboarding-banner';
import { PaymentsTable } from '@/components/payments/payments-table';
import { ApiErrorState } from '@/components/ui/api-error';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { BarChart3 } from 'lucide-react';

/** Overview reads live state on every request; nothing here is prerendered. */
export const dynamic = 'force-dynamic';

/** How many recent payments fill the table below. Counters do not use this. */
const RECENT_LIMIT = 50;

/**
 * Overview: the organization's headline numbers, spend over time, spend by
 * category, anomalies, and the most recent payments.
 */
export default async function OverviewPage() {
  const [agentsResult, summaryResult, seriesResult, paymentsResult, statsResult] =
    await Promise.all([
      listAgents(),
      getSpendSummary({ days: 7 }),
      getTimeseries({ days: 14 }),
      listPayments({ limit: RECENT_LIMIT }),
      getPaymentStats({ days: 7 }),
    ]);

  if (!agentsResult.ok && !summaryResult.ok && !paymentsResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Organization"
          title="Overview"
          description="Spend, policy outcomes and agent activity across the last 14 days."
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
        description="Spend, policy outcomes and agent activity across the last 14 days."
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
                text: `${formatPercentDelta(summary.increasePercent)} vs previous 7 days`,
                tone: summary.increasePercent > 0 ? ('warning' as const) : ('success' as const),
              },
            }
          : {})}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ChartFrame
          title="Spend over time"
          subtitle={`Daily settled spend in ${seriesResult.ok ? seriesResult.data.asset : asset}, last 14 days`}
          table={
            <ChartTable
              columns={['Date', `Spend (${asset})`, 'Payments']}
              rows={(seriesResult.ok ? seriesResult.data.points : []).map((point) => ({
                key: point.date,
                cells: [point.date, point.amount, String(point.count)],
              }))}
            />
          }
        >
          {seriesResult.ok && seriesResult.data.points.length > 0 ? (
            <SpendAreaChart points={seriesResult.data.points} asset={seriesResult.data.asset} />
          ) : (
            <EmptyState
              icon={BarChart3}
              title="No spend recorded yet"
              description="The series fills in once agents start settling payments."
            />
          )}
        </ChartFrame>

        <AnomaliesPanel
          anomalies={summary?.anomalies ?? []}
          source={summary?.source ?? 'analytics'}
        />
      </div>

      <ChartFrame
        title="Spend by category"
        subtitle={`Last 7 days${summary?.largestCategory ? ` · largest: ${summary.largestCategory}` : ''}`}
        table={
          <ChartTable
            columns={['Category', `Spend (${asset})`, 'Payments']}
            rows={(summary?.byCategory ?? []).map((entry) => ({
              key: entry.category,
              cells: [entry.category, entry.amount, String(entry.count)],
            }))}
          />
        }
      >
        {summary && summary.byCategory.length > 0 ? (
          <CategoryBarChart byCategory={summary.byCategory} asset={summary.currency} />
        ) : (
          <EmptyState
            icon={BarChart3}
            title="No categorised spend yet"
            description="Categories appear once payments settle."
          />
        )}
      </ChartFrame>

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

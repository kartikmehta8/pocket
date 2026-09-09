/**
 * Spend intelligence.
 *
 * Purse's ledger says what it authorized. The Graph says what actually settled
 * on chain. Reporting both, and flagging where they disagree, is the point: a
 * control plane that can only see its own decisions cannot detect the case
 * where money moved without one.
 */

import {
  decimalsOf,
  formatAmount,
  isAssetId,
  type AnalyticsProvider,
  type AssetId,
} from '@purse/core';
import {
  dailySpendSeries,
  spendByCategory,
  spendByRecipient,
  totalSpend,
  type Database,
} from '@purse/db';
import { detectAnomalies, reconcile } from './anomalies.js';

/** Collaborators the analytics service needs. */
export interface AnalyticsDeps {
  db: Database;
  analytics: AnalyticsProvider;
}

/** Window boundaries for a report and the equivalent preceding window. */
function windows(days: number, now = new Date()) {
  const span = days * 24 * 60 * 60 * 1000;
  const from = new Date(now.getTime() - span);
  return { from, to: now, previousFrom: new Date(from.getTime() - span), previousTo: from };
}

/**
 * Percentage change between two base-unit totals.
 *
 * @param current - Current window total.
 * @param previous - Previous window total.
 * @returns Percent change to one decimal place, or `null` when the previous
 *   window was zero and a ratio would be infinite rather than informative.
 */
function percentChange(current: bigint, previous: bigint): number | null {
  if (previous === 0n) return null;
  return Math.round((Number(current - previous) / Number(previous)) * 1000) / 10;
}

/** Options accepted by {@link spendSummary}. */
export interface SpendSummaryOptions {
  agentId?: string | undefined;
  days?: number | undefined;
  asset?: AssetId | undefined;
  /** Agent wallet address, required for on-chain reconciliation. */
  address?: string | undefined;
}

/**
 * Builds a spend summary with anomalies.
 *
 * @param deps - Database and analytics provider.
 * @param orgId - Tenant scope.
 * @param options - Agent filter, window length, asset and wallet address.
 * @returns The summary as the API returns it, with money as decimal strings.
 */
export async function spendSummary(
  deps: AnalyticsDeps,
  orgId: string,
  options: SpendSummaryOptions = {},
) {
  const days = options.days ?? 7;
  const asset: AssetId = options.asset ?? 'USDC';
  const { from, to, previousFrom, previousTo } = windows(days);

  const [current, previous, byCategory, byRecipient] = await Promise.all([
    totalSpend(deps.db, orgId, options.agentId, from, to),
    totalSpend(deps.db, orgId, options.agentId, previousFrom, previousTo),
    spendByCategory(deps.db, orgId, options.agentId, from, to),
    spendByRecipient(deps.db, orgId, options.agentId, from, to),
  ]);

  const anomalies = detectAnomalies(current.amount, previous.amount, byRecipient, asset);

  if (options.address !== undefined && deps.analytics.isLive()) {
    const mismatch = await reconcile(deps, options.address, from, to, current.amount, asset);
    if (mismatch !== null) anomalies.push(mismatch);
  }

  const format = (amount: bigint): string => formatAmount(amount, decimalsOf(asset));

  return {
    periodSpend: format(current.amount),
    currency: asset,
    previousPeriodSpend: format(previous.amount),
    increasePercent: percentChange(current.amount, previous.amount),
    paymentCount: current.count,
    largestCategory: byCategory[0]?.category ?? null,
    byCategory: byCategory.map((row) => ({
      category: row.category,
      amount: format(row.amount),
      count: row.count,
    })),
    byRecipient: byRecipient.map((row) => ({
      address: row.address,
      amount: format(row.amount),
      count: row.count,
    })),
    anomalies,
    source: deps.analytics.isLive() ? deps.analytics.name : 'ledger',
  };
}

/**
 * Builds a dense daily spend series for charting.
 *
 * @param deps - Database handle and analytics provider.
 * @param orgId - Tenant scope.
 * @param options - Agent filter, window length and asset.
 * @returns One point per UTC day, including days with no spend, so a chart
 *   shows a flat line rather than silently closing the gap.
 */
export async function spendTimeseries(
  deps: AnalyticsDeps,
  orgId: string,
  options: {
    agentId?: string | undefined;
    days?: number | undefined;
    asset?: string | undefined;
  } = {},
) {
  const days = options.days ?? 14;
  const asset: AssetId = isAssetId(options.asset ?? '') ? (options.asset as AssetId) : 'USDC';
  const { from, to } = windows(days);
  const points = await dailySpendSeries(deps.db, orgId, options.agentId, from, to);
  return {
    asset,
    points: points.map((point) => ({
      date: point.date,
      amount: formatAmount(point.amount, decimalsOf(asset)),
      count: point.count,
    })),
  };
}

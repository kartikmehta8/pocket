/**
 * Ledger-side spend aggregation.
 *
 * These queries answer "what did Pocket authorize". The Graph adapter answers
 * "what actually settled on chain". The analytics service reconciles the two,
 * which is what makes a discrepancy visible rather than invisible.
 */

import { and, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import type { Database } from '../client.js';
import { payments } from '../schema/index.js';

/** Statuses counted as real spend for reporting. */
const SPENT_STATUSES = ['settled', 'submitted'] as const;

/** Spend grouped by payment category. */
export interface CategoryTotal {
  category: string;
  amount: bigint;
  count: number;
}

/** Spend grouped by recipient address. */
export interface RecipientTotal {
  address: string;
  amount: bigint;
  count: number;
}

/** One day of spend. */
export interface DailyPoint {
  date: string;
  amount: bigint;
  count: number;
}

function scope(orgId: string, agentId: string | undefined, from: Date, to: Date) {
  const conditions = [
    eq(payments.orgId, orgId),
    gte(payments.createdAt, from),
    lt(payments.createdAt, to),
    inArray(payments.status, [...SPENT_STATUSES]),
  ];
  if (agentId !== undefined) conditions.push(eq(payments.agentId, agentId));
  return and(...conditions);
}

/**
 * Totals spend in a window.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope.
 * @param agentId - Optional single-agent filter.
 * @param from - Inclusive window start.
 * @param to - Exclusive window end.
 * @returns Total in base units and the number of payments.
 */
export async function totalSpend(
  db: Database,
  orgId: string,
  agentId: string | undefined,
  from: Date,
  to: Date,
): Promise<{ amount: bigint; count: number }> {
  const rows = await db
    .select({
      total: sql<string>`coalesce(sum(${payments.amount}), 0)::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(payments)
    .where(scope(orgId, agentId, from, to));
  return { amount: BigInt(rows[0]?.total ?? '0'), count: rows[0]?.count ?? 0 };
}

/**
 * Groups spend by category, largest first.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope.
 * @param agentId - Optional single-agent filter.
 * @param from - Inclusive window start.
 * @param to - Exclusive window end.
 * @returns Category totals in base units.
 */
export async function spendByCategory(
  db: Database,
  orgId: string,
  agentId: string | undefined,
  from: Date,
  to: Date,
): Promise<CategoryTotal[]> {
  const rows = await db
    .select({
      category: payments.category,
      total: sql<string>`sum(${payments.amount})::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(payments)
    .where(scope(orgId, agentId, from, to))
    .groupBy(payments.category)
    .orderBy(sql`sum(${payments.amount}) desc`);
  return rows.map((row) => ({
    category: row.category,
    amount: BigInt(row.total),
    count: row.count,
  }));
}

/**
 * Groups spend by recipient, largest first.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope.
 * @param agentId - Optional single-agent filter.
 * @param from - Inclusive window start.
 * @param to - Exclusive window end.
 * @param limit - Maximum recipients to return.
 * @returns Recipient totals in base units.
 */
export async function spendByRecipient(
  db: Database,
  orgId: string,
  agentId: string | undefined,
  from: Date,
  to: Date,
  limit = 10,
): Promise<RecipientTotal[]> {
  const rows = await db
    .select({
      address: payments.recipient,
      total: sql<string>`sum(${payments.amount})::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(payments)
    .where(scope(orgId, agentId, from, to))
    .groupBy(payments.recipient)
    .orderBy(sql`sum(${payments.amount}) desc`)
    .limit(limit);
  return rows.map((row) => ({ address: row.address, amount: BigInt(row.total), count: row.count }));
}

/**
 * Produces a dense daily spend series.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope.
 * @param agentId - Optional single-agent filter.
 * @param from - Inclusive window start.
 * @param to - Exclusive window end.
 * @returns One point per UTC day in the window, including days with no spend,
 *   so a chart shows a flat line rather than closing a gap it should not.
 */
export async function dailySpendSeries(
  db: Database,
  orgId: string,
  agentId: string | undefined,
  from: Date,
  to: Date,
): Promise<DailyPoint[]> {
  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${payments.createdAt} at time zone 'utc'), 'YYYY-MM-DD')`,
      total: sql<string>`sum(${payments.amount})::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(payments)
    .where(scope(orgId, agentId, from, to))
    .groupBy(sql`1`);

  const found = new Map(rows.map((row) => [row.day, row]));
  const points: DailyPoint[] = [];
  for (let day = new Date(from); day < to; day.setUTCDate(day.getUTCDate() + 1)) {
    const key = day.toISOString().slice(0, 10);
    const row = found.get(key);
    points.push({
      date: key,
      amount: row === undefined ? 0n : BigInt(row.total),
      count: row?.count ?? 0,
    });
  }
  return points;
}

/**
 * Payment counting.
 *
 * Separate from the spend rollups because a count and a sum answer different
 * questions: "how many attempts did policy see" versus "how much money moved".
 */

import { and, eq, gte, sql } from 'drizzle-orm';
import type { Database } from '../client.js';
import { payments } from '../schema/index.js';

/**
 * Counts payments by status in a window.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope.
 * @param agentId - Optional single-agent filter.
 * @param from - Inclusive window start.
 * @returns One entry per status present, so a dashboard can show real totals
 *   rather than counting a truncated page of recent payments.
 */
export async function countByStatus(
  db: Database,
  orgId: string,
  agentId: string | undefined,
  from: Date,
): Promise<Record<string, number>> {
  const conditions = [eq(payments.orgId, orgId), gte(payments.createdAt, from)];
  if (agentId !== undefined) conditions.push(eq(payments.agentId, agentId));

  const rows = await db
    .select({ status: payments.status, count: sql<number>`count(*)::int` })
    .from(payments)
    .where(and(...conditions))
    .groupBy(payments.status);

  return Object.fromEntries(rows.map((row) => [row.status, row.count]));
}

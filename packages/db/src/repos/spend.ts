/**
 * Spend accounting: how much an agent has committed, and who it has paid.
 *
 * These reads back the budget engine, so they are deliberately conservative.
 * An in-flight payment reserves budget the moment it is authorized, which
 * means a burst of concurrent requests cannot collectively overspend while
 * each one individually looks affordable.
 */

import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import type { PaymentStatus } from '@pocket/core';
import type { Database, Transaction } from '../client.js';
import { payments } from '../schema/index.js';

/** Statuses that reserve budget. A blocked or failed attempt reserves nothing. */
export const RESERVING_STATUSES: readonly PaymentStatus[] = [
  'awaiting_approval',
  'approved',
  'submitted',
  'settled',
];

/**
 * Start of the current UTC day.
 *
 * @param now - Clock injection point for tests.
 * @returns Midnight UTC on the day containing `now`.
 * @remarks Daily budgets reset on the UTC day boundary, not the operator's
 * local midnight, so the reset time does not move with daylight saving.
 */
export function startOfUtcDay(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Sums an agent's reserved spend for the current UTC day.
 *
 * @param db - Database or transaction handle. Pass a transaction to read under a lock.
 * @param agentId - Agent identifier.
 * @param asset - Asset the budget is denominated in.
 * @param now - Clock injection point for tests.
 * @returns Reserved spend in base units.
 */
export async function sumSpendToday(
  db: Database | Transaction,
  agentId: string,
  asset: string,
  now: Date = new Date(),
): Promise<bigint> {
  const rows = await db
    .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)::text` })
    .from(payments)
    .where(
      and(
        eq(payments.agentId, agentId),
        eq(payments.asset, asset),
        gte(payments.createdAt, startOfUtcDay(now)),
        inArray(payments.status, [...RESERVING_STATUSES]),
      ),
    );
  return BigInt(rows[0]?.total ?? '0');
}

/**
 * Counts an agent's reserved payments for the current UTC day.
 *
 * @param db - Database or transaction handle.
 * @param agentId - Agent identifier.
 * @param asset - Asset the budget is denominated in.
 * @param now - Clock injection point for tests.
 * @returns How many payments count against today's allowance.
 */
export async function countSpendToday(
  db: Database | Transaction,
  agentId: string,
  asset: string,
  now: Date = new Date(),
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(payments)
    .where(
      and(
        eq(payments.agentId, agentId),
        eq(payments.asset, asset),
        gte(payments.createdAt, startOfUtcDay(now)),
        inArray(payments.status, [...RESERVING_STATUSES]),
      ),
    );
  return rows[0]?.count ?? 0;
}

/**
 * Lists recipients this agent has actually settled a payment to.
 *
 * @param db - Database or transaction handle.
 * @param agentId - Agent identifier.
 * @returns Lower-cased addresses, for the policy engine's known-recipient rule.
 * @remarks Only `settled` counts. A blocked attempt must never teach the
 * policy engine that a stranger is familiar, or blocking would be a one-time
 * speed bump rather than a control.
 */
export async function listKnownRecipients(
  db: Database | Transaction,
  agentId: string,
): Promise<Set<string>> {
  const rows = await db
    .selectDistinct({ recipient: payments.recipient })
    .from(payments)
    .where(and(eq(payments.agentId, agentId), eq(payments.status, 'settled')));
  return new Set(rows.map((row) => row.recipient.toLowerCase()));
}

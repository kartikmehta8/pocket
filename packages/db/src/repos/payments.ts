/**
 * Payment persistence: the money path.
 *
 * Three invariants hold here. Spend is counted under a row lock so two
 * concurrent payments cannot both pass the same budget check. A replayed
 * idempotency key returns the original payment instead of paying twice. And a
 * payment row and its audit event commit together or not at all.
 *
 * Spend aggregation itself lives in `./spend.js`.
 */

import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { PocketError, type Payment, type PaymentStatus } from '@pocket/core';
import type { Database, Transaction } from '../client.js';
import { agents, payments, taskBudgets } from '../schema/index.js';

/** Fields required to persist a payment attempt. */
export type NewPayment = Omit<typeof payments.$inferInsert, 'createdAt' | 'settledAt'>;

/**
 * Locks an agent row for the duration of the transaction.
 *
 * @param tx - Open transaction.
 * @param agentId - Agent identifier.
 * @remarks This serialises budget arithmetic per agent. Two payments for the
 * same agent queue; payments for different agents do not contend.
 */
export async function lockAgent(tx: Transaction, agentId: string): Promise<void> {
  await tx.select({ id: agents.id }).from(agents).where(eq(agents.id, agentId)).for('update');
}

/**
 * Finds a prior payment for an idempotency key.
 *
 * @param db - Database or transaction handle.
 * @param orgId - Tenant scope.
 * @param key - One key, or the several a caller will accept a match on. A
 *   derived key carries the window it was minted in, so a retry may legitimately
 *   look under the current window and the one before it.
 * @returns The most recent matching payment, or `null` when none matches.
 */
export async function findByIdempotencyKey(
  db: Database | Transaction,
  orgId: string,
  key: string | readonly string[],
): Promise<Payment | null> {
  const keys = typeof key === 'string' ? [key] : [...key];
  if (keys.length === 0) return null;
  const rows = await db
    .select()
    .from(payments)
    .where(and(eq(payments.orgId, orgId), inArray(payments.idempotencyKey, keys)))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  return (rows[0] as Payment | undefined) ?? null;
}

/**
 * Confirms a replayed request matches the one that first used the key.
 *
 * @param existing - The payment stored under this idempotency key.
 * @param incoming - The financially significant fields of the new request.
 * @throws {PocketError} `IDEMPOTENCY_KEY_REUSED` when the key is reused for
 *   different money. Returning the original payment in that case would silently
 *   swallow a real second payment the caller intended to make.
 */
export function assertSameRequest(
  existing: Payment,
  incoming: { agentId: string; amount: bigint; asset: string; chain: string; recipient: string },
): void {
  const same =
    existing.agentId === incoming.agentId &&
    existing.amount === incoming.amount &&
    existing.asset === incoming.asset &&
    existing.chain === incoming.chain &&
    existing.recipient.toLowerCase() === incoming.recipient.toLowerCase();
  if (!same) {
    throw new PocketError(
      'IDEMPOTENCY_KEY_REUSED',
      'This idempotency key was already used for a different payment.',
      { paymentId: existing.id },
    );
  }
}

/**
 * Inserts a payment attempt.
 *
 * @param tx - Open transaction, so the row commits with its audit event.
 * @param input - Payment fields, with money in base units.
 * @returns The persisted payment.
 */
export async function insertPayment(tx: Transaction, input: NewPayment): Promise<Payment> {
  const [row] = await tx.insert(payments).values(input).returning();
  if (row === undefined) throw new Error('Payment insert returned no row.');
  return row as Payment;
}

/**
 * Advances a task budget's consumed amount.
 *
 * @param tx - Open transaction.
 * @param taskBudgetId - Task budget identifier.
 * @param amount - Base units to add to `spent`.
 */
export async function chargeTaskBudget(
  tx: Transaction,
  taskBudgetId: string,
  amount: bigint,
): Promise<void> {
  await tx
    .update(taskBudgets)
    .set({ spent: sql`${taskBudgets.spent} + ${amount.toString()}::numeric` })
    .where(eq(taskBudgets.id, taskBudgetId));
}

/**
 * Records the outcome of a settlement attempt.
 *
 * @param db - Database handle.
 * @param paymentId - Payment identifier.
 * @param patch - New status and, when known, the transaction hash.
 * @returns The updated payment.
 */
export async function updatePaymentStatus(
  db: Database,
  paymentId: string,
  patch: { status: PaymentStatus; txHash?: string | null; settledAt?: Date | null },
): Promise<Payment> {
  const [row] = await db.update(payments).set(patch).where(eq(payments.id, paymentId)).returning();
  if (row === undefined) throw new PocketError('NOT_FOUND', 'Payment not found.');
  return row as Payment;
}

/** Filters accepted by {@link listPayments}. */
export interface PaymentFilter {
  agentId?: string | undefined;
  status?: PaymentStatus | undefined;
  limit?: number | undefined;
}

/**
 * Lists payments for an organization, newest first.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope.
 * @param filter - Optional agent, status and page size.
 * @returns Payments joined with their agent's name for display.
 */
export async function listPayments(
  db: Database,
  orgId: string,
  filter: PaymentFilter = {},
): Promise<Array<Payment & { agentName: string }>> {
  const conditions = [eq(payments.orgId, orgId)];
  if (filter.agentId !== undefined) conditions.push(eq(payments.agentId, filter.agentId));
  if (filter.status !== undefined) conditions.push(eq(payments.status, filter.status));

  const rows = await db
    .select({ payment: payments, agentName: agents.name })
    .from(payments)
    .innerJoin(agents, eq(agents.id, payments.agentId))
    .where(and(...conditions))
    .orderBy(desc(payments.createdAt))
    .limit(Math.min(filter.limit ?? 50, 200));

  return rows.map((row) => ({ ...(row.payment as Payment), agentName: row.agentName }));
}

/**
 * Fetches one payment within a tenant.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope.
 * @param paymentId - Payment identifier.
 * @returns The payment, or `null` when it is not in this organization.
 */
export async function getPayment(
  db: Database,
  orgId: string,
  paymentId: string,
): Promise<Payment | null> {
  const rows = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.orgId, orgId)))
    .limit(1);
  return (rows[0] as Payment | undefined) ?? null;
}

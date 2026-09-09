/**
 * Task budget persistence: envelopes scoped to a single unit of work.
 */

import { and, desc, eq, isNull } from 'drizzle-orm';
import { newId, type TaskBudget } from '@purse/core';
import type { Database, Transaction } from '../client.js';
import { taskBudgets } from '../schema/index.js';

/**
 * Opens a task budget.
 *
 * @param db - Database handle.
 * @param input - Owning agent, label, asset and limit in base units.
 * @returns The created task budget with zero spent.
 */
export async function createTaskBudget(
  db: Database,
  input: { orgId: string; agentId: string; label: string; asset: string; limit: bigint },
): Promise<TaskBudget> {
  const [row] = await db
    .insert(taskBudgets)
    .values({ id: newId('task'), ...input, spent: 0n })
    .returning();
  if (row === undefined) throw new Error('Task budget insert returned no row.');
  return row;
}

/**
 * Lists an agent's task budgets, newest first.
 *
 * @param db - Database handle.
 * @param agentId - Agent identifier.
 * @param openOnly - When true, omits closed budgets.
 * @returns Matching task budgets.
 */
export async function listTaskBudgets(
  db: Database,
  agentId: string,
  openOnly = false,
): Promise<TaskBudget[]> {
  const conditions = [eq(taskBudgets.agentId, agentId)];
  if (openOnly) conditions.push(isNull(taskBudgets.closedAt));
  const rows = await db
    .select()
    .from(taskBudgets)
    .where(and(...conditions))
    .orderBy(desc(taskBudgets.createdAt));
  return rows;
}

/**
 * Fetches one task budget within a tenant.
 *
 * @param db - Database or transaction handle. Pass a transaction to read under a lock.
 * @param orgId - Tenant scope.
 * @param taskBudgetId - Task budget identifier.
 * @returns The task budget, or `null` when it is not in this organization.
 */
export async function getTaskBudget(
  db: Database | Transaction,
  orgId: string,
  taskBudgetId: string,
): Promise<TaskBudget | null> {
  const rows = await db
    .select()
    .from(taskBudgets)
    .where(and(eq(taskBudgets.id, taskBudgetId), eq(taskBudgets.orgId, orgId)))
    .limit(1);
  return (rows[0] as TaskBudget | undefined) ?? null;
}

/**
 * Closes a task budget so no further payment can draw on it.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope.
 * @param taskBudgetId - Task budget identifier.
 * @returns The closed task budget, or `null` when it was not found.
 * @remarks Closing is idempotent: closing an already-closed budget leaves the
 * original timestamp intact.
 */
export async function closeTaskBudget(
  db: Database,
  orgId: string,
  taskBudgetId: string,
): Promise<TaskBudget | null> {
  const [row] = await db
    .update(taskBudgets)
    .set({ closedAt: new Date() })
    .where(
      and(
        eq(taskBudgets.id, taskBudgetId),
        eq(taskBudgets.orgId, orgId),
        isNull(taskBudgets.closedAt),
      ),
    )
    .returning();
  if (row !== undefined) return row;
  return getTaskBudget(db, orgId, taskBudgetId);
}

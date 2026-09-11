/**
 * Agent, wallet, budget and policy persistence.
 */

import { and, eq, isNull } from 'drizzle-orm';
import { newId, type Agent, type AgentStatus, type Budget, type Wallet } from '@pocket/core';
import type { Database } from '../client.js';
import { agents, budgets, policies, wallets } from '../schema/index.js';

/** An agent with the rows that constrain it, as the API returns them together. */
export interface AgentBundle {
  agent: Agent;
  wallet: Wallet | null;
  budget: Budget | null;
  policy: typeof policies.$inferSelect | null;
}

/** Fields accepted when registering an agent. */
export interface NewAgent {
  orgId: string;
  name: string;
  description?: string | undefined;
  metadata?: Record<string, string> | undefined;
}

/**
 * Registers an agent.
 *
 * @param db - Database handle.
 * @param input - Agent fields. The identifier is minted server-side.
 * @returns The created agent.
 */
export async function createAgent(db: Database, input: NewAgent): Promise<Agent> {
  const [row] = await db
    .insert(agents)
    .values({
      id: newId('agent'),
      orgId: input.orgId,
      name: input.name,
      description: input.description ?? null,
      metadata: input.metadata ?? {},
      status: 'active',
    })
    .returning();
  if (row === undefined) throw new Error('Agent insert returned no row.');
  return row as Agent;
}

/**
 * Lists every agent in an organization.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope. Never omit; it is the tenancy boundary.
 * @returns Agents ordered by creation time.
 */
export async function listAgents(db: Database, orgId: string): Promise<Agent[]> {
  const rows = await db
    .select()
    .from(agents)
    .where(and(eq(agents.orgId, orgId), isNull(agents.deletedAt)));
  return rows as Agent[];
}

/**
 * Loads an agent together with its wallet, budget and policy.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope.
 * @param agentId - Agent identifier.
 * @returns The bundle, or `null` when the agent does not belong to the org.
 * @remarks A deleted agent reads as absent, so nothing can be paid from it and
 * no route has to remember to check. Its payments are read from the payments
 * table directly and are unaffected.
 */
export async function getAgentBundle(
  db: Database,
  orgId: string,
  agentId: string,
): Promise<AgentBundle | null> {
  const rows = await db
    .select({ agent: agents, wallet: wallets, budget: budgets, policy: policies })
    .from(agents)
    .leftJoin(wallets, eq(wallets.agentId, agents.id))
    .leftJoin(budgets, eq(budgets.agentId, agents.id))
    .leftJoin(policies, eq(policies.agentId, agents.id))
    .where(and(eq(agents.id, agentId), eq(agents.orgId, orgId), isNull(agents.deletedAt)))
    .limit(1);
  const row = rows[0];
  if (row === undefined) return null;
  return {
    agent: row.agent as Agent,
    wallet: row.wallet,
    budget: row.budget as Budget | null,
    policy: row.policy,
  };
}

/** Fields that may be changed after registration. */
export interface AgentUpdate {
  status?: AgentStatus | undefined;
  description?: string | undefined;
  metadata?: Record<string, string> | undefined;
}

/**
 * Updates an agent's mutable fields.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope.
 * @param agentId - Agent identifier.
 * @param update - Fields to change. Undefined fields are left alone.
 * @returns The updated agent, or `null` when it does not belong to the org.
 */
export async function updateAgent(
  db: Database,
  orgId: string,
  agentId: string,
  update: AgentUpdate,
): Promise<Agent | null> {
  const patch: Record<string, unknown> = {};
  if (update.status !== undefined) patch['status'] = update.status;
  if (update.description !== undefined) patch['description'] = update.description;
  if (update.metadata !== undefined) patch['metadata'] = update.metadata;
  if (Object.keys(patch).length === 0) {
    const bundle = await getAgentBundle(db, orgId, agentId);
    return bundle?.agent ?? null;
  }
  const [row] = await db
    .update(agents)
    .set(patch)
    .where(and(eq(agents.id, agentId), eq(agents.orgId, orgId), isNull(agents.deletedAt)))
    .returning();
  return (row as Agent | undefined) ?? null;
}

/**
 * Marks an agent deleted.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope.
 * @param agentId - Agent identifier.
 * @returns The tombstoned agent, or `null` when it was not there to delete.
 * @remarks A tombstone, never a `DELETE`. Payments, task budgets, approvals
 * and the wallet row all cascade from this row, so removing it would take the
 * ledger with it. Deleting twice is not an error: the second call finds
 * nothing to update and answers `null`, which the route reads as not found.
 */
export async function softDeleteAgent(
  db: Database,
  orgId: string,
  agentId: string,
): Promise<Agent | null> {
  const [row] = await db
    .update(agents)
    .set({ deletedAt: new Date(), status: 'revoked' })
    .where(and(eq(agents.id, agentId), eq(agents.orgId, orgId), isNull(agents.deletedAt)))
    .returning();
  return (row as Agent | undefined) ?? null;
}

/**
 * Creates or replaces an agent's spending envelope.
 *
 * @param db - Database handle.
 * @param agentId - Agent identifier, already checked against the tenant.
 * @param input - Asset and limits in base units.
 * @returns The stored budget.
 */
export async function upsertBudget(
  db: Database,
  agentId: string,
  input: { asset: string; dailyLimit: bigint; perTransactionLimit: bigint },
): Promise<Budget> {
  const [row] = await db
    .insert(budgets)
    .values({ id: newId('bud'), agentId, ...input })
    .onConflictDoUpdate({
      target: budgets.agentId,
      set: { ...input, updatedAt: new Date() },
    })
    .returning();
  if (row === undefined) throw new Error('Budget upsert returned no row.');
  return row;
}

/** Policy fields as stored, with money already in base units. */
export type StoredPolicy = typeof policies.$inferInsert;

/**
 * Creates or replaces an agent's spending policy.
 *
 * @param db - Database handle.
 * @param agentId - Agent identifier, already checked against the tenant.
 * @param input - Policy fields. Recipients are stored lower-cased.
 * @returns The stored policy.
 */
export async function upsertPolicy(
  db: Database,
  agentId: string,
  input: Omit<StoredPolicy, 'id' | 'agentId' | 'updatedAt'>,
): Promise<typeof policies.$inferSelect> {
  const [row] = await db
    .insert(policies)
    .values({ id: newId('pol'), agentId, ...input })
    .onConflictDoUpdate({ target: policies.agentId, set: { ...input, updatedAt: new Date() } })
    .returning();
  if (row === undefined) throw new Error('Policy upsert returned no row.');
  return row;
}

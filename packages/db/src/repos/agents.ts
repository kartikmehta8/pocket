/**
 * Agent, wallet, budget and policy persistence.
 */

import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { newId, type Agent, type AgentStatus, type Budget, type Wallet } from '@pocket/core';
import type { Database } from '../client.js';
import { nextCursor, readCursor } from '../cursor.js';
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

/** Narrows a page of agents. */
export interface AgentFilter {
  /** Page size. Omit for every agent, which is what a picker needs. */
  limit?: number | undefined;
  /** Opaque cursor from a previous page's `nextCursor`. */
  cursor?: string | undefined;
  status?: AgentStatus | undefined;
  /** Matched against the name, the description and the wallet address. */
  search?: string | undefined;
}

/** One page of agents plus the cursor that follows it. */
export interface AgentsPage {
  agents: Agent[];
  nextCursor: string | null;
}

/**
 * Lists an organization's agents, newest first.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope. Never omit; it is the tenancy boundary.
 * @param filter - Optional page size, cursor, status and search term.
 * @returns A page of agents, and the cursor for the page after them.
 * @remarks Unpaged by default. Most callers are pickers — where to move funds,
 * which agent pays — and a picker showing the first page of a list is a picker
 * that silently hides the answer. Only the agents index asks for a limit.
 *
 * Filtering happens here rather than in the browser for the same reason it
 * does on Payments: a page narrowed after it arrives is a page missing the
 * matches that fell on the other side of the cut.
 *
 * The search term is escaped, so a `%` typed into the search box matches a
 * literal percent rather than everything. An omitted limit returns every agent
 * and produces no cursor. The wallet join exists for the address search and
 * cannot duplicate a row: a unique index allows one wallet per agent.
 */
export async function listAgents(
  db: Database,
  orgId: string,
  filter: AgentFilter = {},
): Promise<AgentsPage> {
  const conditions = [eq(agents.orgId, orgId), isNull(agents.deletedAt)];
  if (filter.status !== undefined) conditions.push(eq(agents.status, filter.status));

  const search = filter.search?.trim() ?? '';
  if (search !== '') {
    const term = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    const matches = or(
      ilike(agents.name, term),
      ilike(agents.description, term),
      ilike(wallets.address, term),
    );
    if (matches !== undefined) conditions.push(matches);
  }

  const cursor = readCursor(filter.cursor);
  if (cursor !== null) {
    conditions.push(
      sql`(${agents.createdAt}, ${agents.id}) < (${cursor.createdAt}::timestamptz, ${cursor.id})`,
    );
  }

  const limit = filter.limit === undefined ? null : Math.min(filter.limit, 200);

  const query = db
    .select({ agent: agents, createdAtText: sql<string>`${agents.createdAt}::text` })
    .from(agents)
    .leftJoin(wallets, eq(wallets.agentId, agents.id))
    .where(and(...conditions))
    .orderBy(desc(agents.createdAt), desc(agents.id));

  const rows = await (limit === null ? query : query.limit(limit + 1));
  const page = limit === null ? rows : rows.slice(0, limit);
  const last = page[page.length - 1];

  return {
    agents: page.map((row) => row.agent as Agent),
    nextCursor:
      limit === null
        ? null
        : nextCursor(
            last === undefined
              ? undefined
              : { createdAtText: last.createdAtText, id: last.agent.id },
            rows.length > limit,
          ),
  };
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
  name?: string | undefined;
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
  if (update.name !== undefined) patch['name'] = update.name;
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

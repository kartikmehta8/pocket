/**
 * Financial tables: the envelopes that constrain spending, the payments
 * themselves, and the append-only record of everything that happened.
 */

import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { baseUnits } from './columns.js';
import { agents, organizations } from './tenancy.js';

/** An agent's recurring spending envelope. One row per agent. */
export const budgets = pgTable(
  'budgets',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    asset: text('asset').notNull(),
    dailyLimit: baseUnits('daily_limit').notNull(),
    perTransactionLimit: baseUnits('per_transaction_limit').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('budgets_agent_idx').on(table.agentId)],
);

/** A budget scoped to one unit of work. `spent` advances inside the payment transaction. */
export const taskBudgets = pgTable(
  'task_budgets',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    asset: text('asset').notNull(),
    limit: baseUnits('spend_limit').notNull(),
    // A SQL literal rather than `0n`: drizzle-kit serialises defaults to JSON
    // when diffing, and JSON cannot represent a bigint.
    spent: baseUnits('spent')
      .notNull()
      .default(sql`0`),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('task_budgets_agent_idx').on(table.agentId)],
);

/** An agent's spending policy. One row per agent; an absent row denies. */
export const policies = pgTable(
  'policies',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    allowedAssets: jsonb('allowed_assets').$type<string[]>().notNull(),
    allowedChains: jsonb('allowed_chains').$type<string[]>().notNull(),
    allowedCategories: jsonb('allowed_categories').$type<string[]>().notNull(),
    maxTransactionAmount: baseUnits('max_transaction_amount').notNull(),
    trustedRecipients: jsonb('trusted_recipients').$type<string[]>().notNull().default([]),
    unknownRecipientBehaviour: text('unknown_recipient_behaviour').notNull(),
    approvalThreshold: baseUnits('approval_threshold'),
    /** Value ceiling in USD cents. Null disables the rule. */
    maxUsdCents: baseUnits('max_usd_cents'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('policies_agent_idx').on(table.agentId)],
);

/**
 * Every payment attempt, including the ones policy blocked.
 *
 * @remarks Blocked attempts are rows too. "Why was my agent stopped?" is an
 * auditable question, and discarding the evidence would make it unanswerable.
 * The unique index on `(org_id, idempotency_key)` is what makes execution
 * idempotent: a replayed request collides instead of paying twice. Only an
 * attempt that reserved something carries a key; see the column.
 */
export const payments = pgTable(
  'payments',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    taskBudgetId: text('task_budget_id').references(() => taskBudgets.id, { onDelete: 'set null' }),
    /**
     * Null on a blocked attempt. Nothing was charged, so there is nothing to
     * protect from happening twice, and holding the key would stop the agent
     * ever retrying once the limit that blocked it is raised. Postgres allows
     * many nulls under a unique index, so blocked rows never collide.
     */
    idempotencyKey: text('idempotency_key'),
    amount: baseUnits('amount').notNull(),
    asset: text('asset').notNull(),
    chain: text('chain').notNull(),
    recipient: text('recipient').notNull(),
    category: text('category').notNull(),
    reason: text('reason').notNull(),
    resource: text('resource'),
    initiatedBy: text('initiated_by').notNull(),
    status: text('status').notNull(),
    denialCode: text('denial_code'),
    /** The full authorization decision, retained as evidence. */
    decision: jsonb('decision').$type<Record<string, unknown>>(),
    txHash: text('tx_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    settledAt: timestamp('settled_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('payments_idempotency_idx').on(table.orgId, table.idempotencyKey),
    index('payments_agent_created_idx').on(table.agentId, table.createdAt),
    index('payments_org_created_idx').on(table.orgId, table.createdAt),
  ],
);

/** Human decisions on payments that policy escalated. */
export const approvals = pgTable('approvals', {
  id: text('id').primaryKey(),
  paymentId: text('payment_id')
    .notNull()
    .references(() => payments.id, { onDelete: 'cascade' }),
  decidedBy: text('decided_by').notNull(),
  approved: boolean('approved').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Append-only audit trail, written in the same transaction as the fact it
 * records so a money move and its evidence commit or fail together.
 */
export const auditEvents = pgTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** Monotonic per-database ordering, used for stable cursor pagination. */
    seq: integer('seq').generatedAlwaysAsIdentity(),
    actorType: text('actor_type').notNull(),
    actorId: text('actor_id'),
    action: text('action').notNull(),
    subjectType: text('subject_type').notNull(),
    subjectId: text('subject_id'),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('audit_org_seq_idx').on(table.orgId, table.seq)],
);

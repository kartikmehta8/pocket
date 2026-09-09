/**
 * Tenancy tables: who the customer is, how they authenticate, and which agents
 * and wallets they own.
 */

import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/** Tenants. Every other row is reachable from exactly one organization. */
export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Organization credentials.
 *
 * @remarks Only the SHA-256 hash is stored. The plaintext key is returned to
 * the caller exactly once at creation and is never written anywhere.
 */
export const apiKeys = pgTable(
  'api_keys',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    hash: text('hash').notNull(),
    /** First 16 characters of the plaintext, so a key is identifiable in a list. */
    prefix: text('prefix').notNull(),
    /** Operator-supplied name, so a key can be revoked by purpose. */
    label: text('label').notNull().default('Default key'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [uniqueIndex('api_keys_hash_idx').on(table.hash)],
);

/** Autonomous agents. Only an `active` agent may spend. */
export const agents = pgTable(
  'agents',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    status: text('status').notNull().default('active'),
    metadata: jsonb('metadata').$type<Record<string, string>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('agents_org_idx').on(table.orgId)],
);

/** Provider-custodied wallets. Exactly one per agent, and never holds a secret. */
export const wallets = pgTable(
  'wallets',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerWalletId: text('provider_wallet_id').notNull(),
    address: text('address').notNull(),
    chain: text('chain').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('wallets_agent_idx').on(table.agentId)],
);

/**
 * People who sign in to the dashboard.
 *
 * @remarks Keyed on the identity provider's subject rather than on an email
 * address, because an email can be changed and reused while the subject
 * cannot. One row maps one human to exactly one organization; the first sign
 * in is what creates both.
 */
export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** Identity-provider subject identifier. Never a credential. */
    subject: text('subject').notNull(),
    email: text('email'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('users_subject_idx').on(table.subject)],
);

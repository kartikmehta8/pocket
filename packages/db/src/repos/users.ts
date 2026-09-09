/**
 * Dashboard user persistence.
 *
 * Signing in for the first time is what creates a tenant. That makes this the
 * only place in the system where an organization comes into existence without
 * an operator asking for one, so it happens in a single transaction: no user
 * row can exist without its organization, and no organization created this way
 * can exist without a key its owner can actually use.
 */

import { eq } from 'drizzle-orm';
import { apiKeyPrefix, newApiKey, newId, type Organization } from '@purse/core';
import type { Database } from '../client.js';
import { hashApiKey } from '../client.js';
import { apiKeys, organizations, users } from '../schema/index.js';

/** A person who can sign in to the dashboard. */
export interface User {
  id: string;
  orgId: string;
  subject: string;
  email: string | null;
  createdAt: Date;
}

/** The result of resolving a session token to a tenant. */
export interface ResolvedSession {
  org: Organization;
  user: User;
  /** True when this call is what brought the organization into existence. */
  provisioned: boolean;
  /**
   * Plaintext key minted alongside a brand-new organization.
   *
   * @remarks Present only when `provisioned` is true. It is never persisted in
   * the clear and cannot be retrieved again; the caller either surfaces it or
   * loses it.
   */
  apiKey: string | null;
}

/**
 * Resolves an identity subject to its organization, creating one on first sight.
 *
 * @param db - Database handle.
 * @param input - Verified subject, optional email, and the name to give a
 *   newly created organization.
 * @returns The organization, the user row, and a one-time key when the
 *   organization was just created.
 * @remarks Concurrent first sign-ins race on the unique index over `subject`.
 *   The loser's insert is discarded by `onConflictDoNothing` and it re-reads
 *   the winner's row, so two tabs opened at once still produce one tenant.
 */
export async function resolveSession(
  db: Database,
  input: { subject: string; email: string | null; orgName: string },
): Promise<ResolvedSession> {
  const existing = await findSession(db, input.subject);
  if (existing !== null) {
    await db
      .update(users)
      .set({ lastSeenAt: new Date(), ...(input.email === null ? {} : { email: input.email }) })
      .where(eq(users.id, existing.user.id));
    return { ...existing, provisioned: false, apiKey: null };
  }

  const plaintext = newApiKey();
  const orgId = newId('org');

  const created = await db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({ id: orgId, name: input.orgName })
      .returning();
    if (org === undefined) throw new Error('Organization insert returned no row.');

    await tx.insert(apiKeys).values({
      id: newId('key'),
      orgId,
      hash: hashApiKey(plaintext),
      prefix: apiKeyPrefix(plaintext),
      label: 'Default key',
    });

    const [user] = await tx
      .insert(users)
      .values({ id: newId('user'), orgId, subject: input.subject, email: input.email })
      .onConflictDoNothing({ target: users.subject })
      .returning();

    return user === undefined ? null : { org, user };
  });

  if (created === null) {
    // Another request won the race and owns the tenant. Ours was rolled back
    // together with the key we minted, so there is nothing to hand back.
    const winner = await findSession(db, input.subject);
    if (winner === null) throw new Error('Session insert conflicted but no row was found.');
    return { ...winner, provisioned: false, apiKey: null };
  }

  return { ...created, provisioned: true, apiKey: plaintext };
}

/**
 * Looks up the organization behind an identity subject.
 *
 * @param db - Database handle.
 * @param subject - Verified identity-provider subject.
 * @returns The organization and user, or `null` when the subject is unknown.
 */
export async function findSession(
  db: Database,
  subject: string,
): Promise<{ org: Organization; user: User } | null> {
  const rows = await db
    .select({ org: organizations, user: users })
    .from(users)
    .innerJoin(organizations, eq(organizations.id, users.orgId))
    .where(eq(users.subject, subject))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Fetches a user by id.
 *
 * @param db - Database handle.
 * @param userId - User identifier.
 * @returns The user, or `null` when the id is unknown.
 */
export async function findUserById(db: Database, userId: string): Promise<User | null> {
  const rows = await db
    .select({
      id: users.id,
      orgId: users.orgId,
      subject: users.subject,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

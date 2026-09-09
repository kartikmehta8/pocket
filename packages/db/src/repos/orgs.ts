/**
 * Organization persistence: creating a tenant, resolving a credential to one,
 * and the membership changes that move a person between them.
 */

import { and, eq, isNull, sql } from 'drizzle-orm';
import { newApiKey, newId, apiKeyPrefix, type Organization } from '@purse/core';
import type { Database } from '../client.js';
import { hashApiKey } from '../client.js';
import { apiKeys, organizations, users } from '../schema/index.js';
import type { User } from './users.js';

/** An organization plus the one-time plaintext key minted alongside it. */
export interface CreatedOrganization {
  org: Organization;
  /** Shown to the caller once. Never retrievable again. */
  apiKey: string;
}

/**
 * Creates an organization and its first API key.
 *
 * @param db - Database handle.
 * @param name - Human-readable organization name.
 * @returns The organization and the plaintext key, which the caller must
 *   surface immediately because only its hash is retained.
 */
export async function createOrganization(db: Database, name: string): Promise<CreatedOrganization> {
  const orgId = newId('org');
  const plaintext = newApiKey();

  const org = await db.transaction(async (tx) => {
    const [row] = await tx.insert(organizations).values({ id: orgId, name }).returning();
    await tx.insert(apiKeys).values({
      id: newId('key'),
      orgId,
      hash: hashApiKey(plaintext),
      prefix: apiKeyPrefix(plaintext),
    });
    return row;
  });

  if (org === undefined) throw new Error('Organization insert returned no row.');
  return { org, apiKey: plaintext };
}

/**
 * Resolves a presented API key to its organization.
 *
 * @param db - Database handle.
 * @param plaintext - The bearer token from the request.
 * @returns The owning organization, or `null` when the key is unknown or revoked.
 * @remarks Lookup is by hash, so an attacker with read access to the table
 * still cannot authenticate.
 */
export async function findOrganizationByApiKey(
  db: Database,
  plaintext: string,
): Promise<Organization | null> {
  const rows = await db
    .select({ org: organizations })
    .from(apiKeys)
    .innerJoin(organizations, eq(organizations.id, apiKeys.orgId))
    .where(and(eq(apiKeys.hash, hashApiKey(plaintext)), isNull(apiKeys.revokedAt)))
    .limit(1);
  return rows[0]?.org ?? null;
}

/**
 * Fetches an organization by id.
 *
 * @param db - Database handle.
 * @param orgId - Organization identifier.
 * @returns The organization, or `null` when it does not exist.
 */
export async function findOrganizationById(
  db: Database,
  orgId: string,
): Promise<Organization | null> {
  const rows = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  return rows[0] ?? null;
}

/**
 * Renames an organization.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope.
 * @param name - New display name.
 * @returns The updated organization, or `null` when it does not exist.
 */
export async function renameOrganization(
  db: Database,
  orgId: string,
  name: string,
): Promise<Organization | null> {
  const rows = await db
    .update(organizations)
    .set({ name })
    .where(eq(organizations.id, orgId))
    .returning();
  return rows[0] ?? null;
}

/**
 * Moves a user to a different organization.
 *
 * @param db - Database handle.
 * @param email - Address the user signed in with.
 * @param orgId - Organization to move them to.
 * @returns The updated user, or `null` when no user has that email.
 * @remarks An administrative operation, reachable only from the `adopt` script
 *   and never from the HTTP surface. It changes which tenant's money a person
 *   can see, so it is deliberately not something a request can trigger.
 */
export async function moveUserToOrganization(
  db: Database,
  email: string,
  orgId: string,
): Promise<User | null> {
  const rows = await db.update(users).set({ orgId }).where(eq(users.email, email)).returning({
    id: users.id,
    orgId: users.orgId,
    subject: users.subject,
    email: users.email,
    createdAt: users.createdAt,
  });
  return rows[0] ?? null;
}

/**
 * Counts the people who can sign in to an organization.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope.
 * @returns The member count.
 */
export async function countMembers(db: Database, orgId: string): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.orgId, orgId));
  return rows[0]?.total ?? 0;
}

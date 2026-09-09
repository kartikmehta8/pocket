/**
 * API key lifecycle.
 *
 * A key is the credential an agent runtime presents, so it is the one thing an
 * operator must be able to rotate without waiting for support. Only the hash is
 * ever stored: issuing returns the plaintext once, listing returns the prefix,
 * and revoking is a timestamp rather than a delete so the audit trail still
 * refers to a row that exists.
 */

import { and, asc, eq, isNull } from 'drizzle-orm';
import { apiKeyPrefix, newApiKey, newId } from '@purse/core';
import type { Database } from '../client.js';
import { hashApiKey } from '../client.js';
import { apiKeys } from '../schema/index.js';

/** An API key as an operator sees it. Never carries the secret. */
export interface ApiKeySummary {
  id: string;
  label: string;
  /** First 16 characters of the plaintext, enough to recognise a key. */
  prefix: string;
  createdAt: Date;
  revokedAt: Date | null;
}

/** A newly minted key, with its plaintext attached exactly once. */
export interface IssuedApiKey {
  key: ApiKeySummary;
  /** Shown to the caller once. Never retrievable again. */
  plaintext: string;
}

/**
 * Lists an organization's keys, live ones first.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope.
 * @returns Key summaries in creation order, without any secret material.
 */
export async function listApiKeys(db: Database, orgId: string): Promise<ApiKeySummary[]> {
  return db
    .select({
      id: apiKeys.id,
      label: apiKeys.label,
      prefix: apiKeys.prefix,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.orgId, orgId))
    .orderBy(asc(apiKeys.createdAt));
}

/**
 * Mints a new key for an organization.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope.
 * @param label - Operator-supplied name describing what will use the key.
 * @returns The key summary and its plaintext, which the caller must surface
 *   immediately because only the hash is retained.
 */
export async function issueApiKey(
  db: Database,
  orgId: string,
  label: string,
): Promise<IssuedApiKey> {
  const plaintext = newApiKey();
  const rows = await db
    .insert(apiKeys)
    .values({
      id: newId('key'),
      orgId,
      hash: hashApiKey(plaintext),
      prefix: apiKeyPrefix(plaintext),
      label,
    })
    .returning({
      id: apiKeys.id,
      label: apiKeys.label,
      prefix: apiKeys.prefix,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    });

  const key = rows[0];
  if (key === undefined) throw new Error('API key insert returned no row.');
  return { key, plaintext };
}

/**
 * Revokes a key.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope.
 * @param keyId - Key identifier.
 * @returns The revoked key, or `null` when it does not exist in this
 *   organization or was already revoked.
 * @remarks Scoped by `orgId` in the `where` clause rather than checked
 *   afterwards, so one tenant cannot revoke another's credential.
 */
export async function revokeApiKey(
  db: Database,
  orgId: string,
  keyId: string,
): Promise<ApiKeySummary | null> {
  const rows = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, orgId), isNull(apiKeys.revokedAt)))
    .returning({
      id: apiKeys.id,
      label: apiKeys.label,
      prefix: apiKeys.prefix,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    });
  return rows[0] ?? null;
}

/**
 * Counts an organization's usable keys.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope.
 * @returns How many keys are live, used to refuse revoking the last one.
 */
export async function countLiveApiKeys(db: Database, orgId: string): Promise<number> {
  const rows = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(and(eq(apiKeys.orgId, orgId), isNull(apiKeys.revokedAt)));
  return rows.length;
}

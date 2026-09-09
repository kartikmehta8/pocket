/**
 * Audit trail persistence.
 *
 * The trail is append-only: there is no update and no delete. A money-moving
 * action writes its audit event inside the same transaction as the change
 * itself, so the record cannot survive a rolled-back payment or go missing
 * after a committed one.
 */

import { and, desc, eq, lt } from 'drizzle-orm';
import { newId, type AuditEvent } from '@pocket/core';
import type { Database, Transaction } from '../client.js';
import { auditEvents } from '../schema/index.js';

/** Fields required to append an audit event. */
export interface NewAuditEvent {
  orgId: string;
  actorType: 'agent' | 'human' | 'system';
  actorId?: string | null;
  action: string;
  subjectType: string;
  subjectId?: string | null;
  payload?: Record<string, unknown>;
}

/**
 * Appends one audit event.
 *
 * @param db - Database or transaction handle. Always pass the transaction when
 *   recording something that moved money.
 * @param event - The event to record. The payload must contain no credentials,
 *   signatures or raw sensitive vendor responses.
 */
export async function appendAuditEvent(
  db: Database | Transaction,
  event: NewAuditEvent,
): Promise<void> {
  await db.insert(auditEvents).values({
    id: newId('aud'),
    orgId: event.orgId,
    actorType: event.actorType,
    actorId: event.actorId ?? null,
    action: event.action,
    subjectType: event.subjectType,
    subjectId: event.subjectId ?? null,
    payload: event.payload ?? {},
  });
}

/** One page of audit events plus the cursor that follows it. */
export interface AuditPage {
  events: Array<AuditEvent & { seq: number }>;
  nextCursor: string | null;
}

/**
 * Reads the audit trail newest first.
 *
 * @param db - Database handle.
 * @param orgId - Tenant scope.
 * @param options - Page size and an opaque cursor from a previous page.
 * @returns A page of events and the cursor to fetch the next one.
 * @remarks Pagination keys on the monotonic `seq` column rather than on
 * `createdAt`, so events written in the same millisecond still page correctly.
 */
export async function listAuditEvents(
  db: Database,
  orgId: string,
  options: { limit?: number; cursor?: string | undefined } = {},
): Promise<AuditPage> {
  const limit = Math.min(options.limit ?? 50, 200);
  const conditions = [eq(auditEvents.orgId, orgId)];
  if (options.cursor !== undefined && /^\d+$/.test(options.cursor)) {
    conditions.push(lt(auditEvents.seq, Number(options.cursor)));
  }

  const rows = await db
    .select()
    .from(auditEvents)
    .where(and(...conditions))
    .orderBy(desc(auditEvents.seq))
    .limit(limit + 1);

  const page = rows.slice(0, limit) as Array<AuditEvent & { seq: number }>;
  const nextCursor = rows.length > limit ? String(page[page.length - 1]?.seq) : null;
  return { events: page, nextCursor };
}

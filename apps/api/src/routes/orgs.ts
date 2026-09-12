/**
 * Organization bootstrap and service health.
 */

import type { FastifyInstance } from 'fastify';
import { createOrgSchema, renameOrgSchema, PocketError } from '@pocket/core';
import {
  appendAuditEvent,
  countMembers,
  createOrganization,
  findOrganizationById,
  findUserById,
  issueApiKey,
  renameOrganization,
} from '@pocket/db';
import { requireHuman } from '../auth.js';
import type { AppContext } from '../context.js';

/**
 * Registers organization and health routes.
 *
 * @param app - Fastify instance.
 * @param ctx - Application context.
 */
export function registerOrgRoutes(app: FastifyInstance, ctx: AppContext): void {
  /** `GET /v1/health` — adapter wiring and the chain, without a credential. */
  app.get('/v1/health', () => ({
    ok: true,
    adapters: ctx.modes,
    chain: ctx.config.CHAIN,
  }));

  /**
   * `POST /v1/orgs` — creates an organization and its first key.
   *
   * The only door into an organization with no signed-in person, so it mints the
   * first key itself. Sign-in deliberately does not: a dashboard user can see the
   * form and create one on purpose.
   *
   * The plaintext key exists only in this response. It is never persisted, never
   * logged, and cannot be retrieved again.
   */
  app.post('/v1/orgs', async (request, reply) => {
    const body = createOrgSchema.parse(request.body);
    const org = await createOrganization(ctx.db, body.name);
    const { plaintext } = await issueApiKey(ctx.db, org.id, 'Bootstrap key');
    reply.status(201);
    return {
      org: { id: org.id, name: org.name, createdAt: org.createdAt.toISOString() },
      apiKey: plaintext,
    };
  });

  /**
   * `GET /v1/orgs/me` — the calling organization, and the person if there is one.
   *
   * `user` is null for a machine caller. An API key belongs to an organization
   * rather than to a person, and inventing one would misattribute the audit trail.
   */
  app.get('/v1/orgs/me', async (request) => {
    const org = await findOrganizationById(ctx.db, request.orgId);
    if (org === null) throw new PocketError('NOT_FOUND', 'Organization not found.');
    const [members, user] = await Promise.all([
      countMembers(ctx.db, request.orgId),
      request.userId === null ? Promise.resolve(null) : findUserById(ctx.db, request.userId),
    ]);
    return {
      org: { id: org.id, name: org.name, createdAt: org.createdAt.toISOString(), members },
      user:
        user === null
          ? null
          : { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
      principal: request.principal,
    };
  });

  /** `PATCH /v1/orgs/me` — renames the organization. Signed-in humans only. */
  app.patch('/v1/orgs/me', async (request) => {
    requireHuman(request);
    const body = renameOrgSchema.parse(request.body);
    const org = await renameOrganization(ctx.db, request.orgId, body.name);
    if (org === null) throw new PocketError('NOT_FOUND', 'Organization not found.');

    await appendAuditEvent(ctx.db, {
      orgId: org.id,
      actorType: 'human',
      actorId: request.userId,
      action: 'org.renamed',
      subjectType: 'organization',
      subjectId: org.id,
      payload: { name: org.name },
    });

    const members = await countMembers(ctx.db, request.orgId);
    return {
      org: { id: org.id, name: org.name, createdAt: org.createdAt.toISOString(), members },
    };
  });
}

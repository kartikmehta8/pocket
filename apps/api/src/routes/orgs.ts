/**
 * Organization bootstrap and service health.
 */

import type { FastifyInstance } from 'fastify';
import { createOrgSchema, renameOrgSchema, PurseError } from '@purse/core';
import {
  appendAuditEvent,
  countMembers,
  createOrganization,
  findOrganizationById,
  findUserById,
  renameOrganization,
} from '@purse/db';
import { requireHuman } from '../auth.js';
import type { AppContext } from '../context.js';

/**
 * Registers organization and health routes.
 *
 * @param app - Fastify instance.
 * @param ctx - Application context.
 */
export function registerOrgRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get('/v1/health', () => ({
    ok: true,
    adapters: ctx.modes,
    chain: ctx.config.CHAIN,
  }));

  app.post('/v1/orgs', async (request, reply) => {
    const body = createOrgSchema.parse(request.body);
    const { org, apiKey } = await createOrganization(ctx.db, body.name);
    reply.status(201);
    // The plaintext key exists only in this response. It is never persisted,
    // never logged, and cannot be retrieved again.
    return {
      org: { id: org.id, name: org.name, createdAt: org.createdAt.toISOString() },
      apiKey,
    };
  });

  app.get('/v1/orgs/me', async (request) => {
    const org = await findOrganizationById(ctx.db, request.orgId);
    if (org === null) throw new PurseError('NOT_FOUND', 'Organization not found.');
    const [members, user] = await Promise.all([
      countMembers(ctx.db, request.orgId),
      request.userId === null ? Promise.resolve(null) : findUserById(ctx.db, request.userId),
    ]);
    return {
      org: { id: org.id, name: org.name, createdAt: org.createdAt.toISOString(), members },
      // Null for a machine caller. An API key belongs to an organization, not
      // to a person, and inventing one would misattribute the audit trail.
      user:
        user === null
          ? null
          : { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
      principal: request.principal,
    };
  });

  app.patch('/v1/orgs/me', async (request) => {
    requireHuman(request);
    const body = renameOrgSchema.parse(request.body);
    const org = await renameOrganization(ctx.db, request.orgId, body.name);
    if (org === null) throw new PurseError('NOT_FOUND', 'Organization not found.');

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

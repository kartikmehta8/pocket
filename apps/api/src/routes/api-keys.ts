/**
 * API key management.
 *
 * Every route here requires a signed-in person. A key that has leaked must not
 * be able to enumerate its siblings, mint a replacement for itself, or revoke
 * the ones an operator would use to lock it out.
 */

import type { FastifyInstance } from 'fastify';
import { createApiKeySchema, PocketError } from '@pocket/core';
import {
  appendAuditEvent,
  countLiveApiKeys,
  findLiveApiKey,
  issueApiKey,
  listApiKeys,
  revokeApiKey,
  type ApiKeySummary,
} from '@pocket/db';
import { requireHuman } from '../auth.js';
import type { AppContext } from '../context.js';

/** Renders a key summary for the wire. Never includes secret material. */
function keyToJson(key: ApiKeySummary): Record<string, unknown> {
  return {
    id: key.id,
    label: key.label,
    prefix: key.prefix,
    createdAt: key.createdAt.toISOString(),
    revokedAt: key.revokedAt?.toISOString() ?? null,
  };
}

/**
 * Registers API key routes.
 *
 * @param app - Fastify instance.
 * @param ctx - Application context.
 */
export function registerApiKeyRoutes(app: FastifyInstance, ctx: AppContext): void {
  /** `GET /v1/api-keys` — every key in the organization, hashes only. */
  app.get('/v1/api-keys', async (request) => {
    requireHuman(request);
    const keys = await listApiKeys(ctx.db, request.orgId);
    return { keys: keys.map(keyToJson) };
  });

  /**
   * `POST /v1/api-keys` — mints a key and returns it once.
   *
   * The plaintext exists only in this response body. It is never persisted, never
   * logged, and cannot be recovered afterwards.
   */
  app.post('/v1/api-keys', async (request, reply) => {
    requireHuman(request);
    const body = createApiKeySchema.parse(request.body);
    const { key, plaintext } = await issueApiKey(ctx.db, request.orgId, body.label);

    await appendAuditEvent(ctx.db, {
      orgId: request.orgId,
      actorType: 'human',
      actorId: request.userId,
      action: 'api_key.issued',
      subjectType: 'api_key',
      subjectId: key.id,
      payload: { label: key.label, prefix: key.prefix },
    });

    reply.status(201);
    return { key: keyToJson(key), apiKey: plaintext };
  });

  /**
   * `DELETE /v1/api-keys/:id` — revokes a key.
   *
   * Existence is checked before anything else. An organization with no keys at
   * all, which is how every one of them starts, would otherwise be told to create
   * a replacement for a key it never had — and a stranger probing another tenant's
   * key id would learn something from the difference between the two refusals.
   *
   * The last live key cannot be revoked. That is not paternalism: revoking it
   * would strand every agent runtime with no way back in except minting a new one
   * from a browser, which is exactly the situation an operator is trying to avoid.
   */
  app.delete('/v1/api-keys/:id', async (request) => {
    requireHuman(request);
    const { id } = request.params as { id: string };

    const target = await findLiveApiKey(ctx.db, request.orgId, id);
    if (target === null) throw new PocketError('NOT_FOUND', 'API key not found.', { keyId: id });

    const live = await countLiveApiKeys(ctx.db, request.orgId);
    if (live <= 1) {
      throw new PocketError(
        'VALIDATION_FAILED',
        'Create a replacement key before revoking the last one.',
      );
    }

    const key = await revokeApiKey(ctx.db, request.orgId, id);
    if (key === null) throw new PocketError('NOT_FOUND', 'API key not found.', { keyId: id });

    await appendAuditEvent(ctx.db, {
      orgId: request.orgId,
      actorType: 'human',
      actorId: request.userId,
      action: 'api_key.revoked',
      subjectType: 'api_key',
      subjectId: key.id,
      payload: { label: key.label, prefix: key.prefix },
    });

    return { key: keyToJson(key) };
  });
}

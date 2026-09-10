/**
 * Dashboard sign-in.
 *
 * One route, and it is the only place in Pocket where a tenant can be created
 * without an operator already holding a credential. It runs before the auth
 * hook has resolved an organization, so it verifies the identity token itself
 * rather than trusting anything on the request.
 */

import type { FastifyInstance } from 'fastify';
import { createSessionSchema, PocketError } from '@pocket/core';
import { appendAuditEvent, resolveSession } from '@pocket/db';
import { bearerToken } from '../auth.js';
import type { AppContext } from '../context.js';

/** Default organization name, used when the browser supplies none. */
const DEFAULT_ORG_NAME = 'My organization';

/**
 * Derives a readable organization name from an email address.
 *
 * @param email - Verified email, or `null`.
 * @returns The domain-derived name, or the generic default.
 * @remarks `ada@northwind.io` becomes `Northwind`, which is a better first
 * impression than a random identifier and is renameable from settings.
 */
function orgNameFor(email: string | null): string {
  const domain = email?.split('@')[1];
  const label = domain?.split('.')[0];
  if (label === undefined || label === '') return DEFAULT_ORG_NAME;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Registers the session route.
 *
 * @param app - Fastify instance.
 * @param ctx - Application context.
 */
export function registerAuthRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post('/v1/auth/session', async (request, reply) => {
    const token = bearerToken(request);
    if (token === null) {
      throw new PocketError('UNAUTHORIZED', 'Provide the identity token as a bearer token.');
    }
    const body = createSessionSchema.parse(request.body ?? {});
    const identity = await ctx.identity.verify(token);

    // The access token carries a subject but no contact detail. Privy's
    // identity token does, so the browser forwards it here and the lookup
    // costs no rate-limited call. Absent, the organization simply gets a
    // generic name the operator can rename.
    const profileToken = request.headers['x-identity-token'];
    const profile = await ctx.identity.profile(
      identity.subject,
      typeof profileToken === 'string' ? profileToken : undefined,
    );
    const email = profile?.email ?? identity.email;

    const session = await resolveSession(ctx.db, {
      subject: identity.subject,
      email,
      orgName: body.orgName ?? orgNameFor(email),
    });

    if (session.provisioned) {
      await appendAuditEvent(ctx.db, {
        orgId: session.org.id,
        actorType: 'human',
        actorId: session.user.id,
        action: 'org.created',
        subjectType: 'organization',
        subjectId: session.org.id,
        payload: { provider: ctx.identity.name },
      });
    }

    reply.status(session.provisioned ? 201 : 200);
    return {
      org: {
        id: session.org.id,
        name: session.org.name,
        createdAt: session.org.createdAt.toISOString(),
      },
      user: {
        id: session.user.id,
        email: session.user.email,
        createdAt: session.user.createdAt.toISOString(),
      },
      provisioned: session.provisioned,
    };
  });
}

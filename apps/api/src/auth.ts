/**
 * Bearer authentication.
 *
 * Pocket accepts two kinds of credential on the same header, because two very
 * different callers need in. An agent runtime presents a long-lived
 * organization API key. A person presents a short-lived token from the
 * identity provider. Which one arrived is recorded on the request, so a route
 * that must not be reachable by a leaked machine key can say so.
 *
 * Authorization is deny-by-default: a route is protected unless it is on the
 * explicit public list.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { PocketError } from '@pocket/core';
import { findOrganizationByApiKey, findSession } from '@pocket/db';
import type { AppContext } from './context.js';

/** Routes that may be called without a key. Everything else is protected. */
const PUBLIC_ROUTES = new Set([
  'POST:/v1/orgs',
  // The service's own description. It names endpoints and vendors, all of
  // which are public, and nothing that belongs to an organization.
  'GET:/',
  'GET:/v1/health',
  // Session bootstrap authenticates the identity token itself; it cannot
  // require an organization, because establishing one is what it does.
  'POST:/v1/auth/session',
]);

/** Prefix that distinguishes a Pocket API key from an identity token. */
const API_KEY_PREFIX = 'pocket_sk_';

/**
 * Extracts a bearer token.
 *
 * @param request - Incoming request.
 * @returns The token, or `null` when the header is absent or malformed.
 */
export function bearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || token === undefined || token === '') return null;
  return token;
}

/**
 * Resolves an API key to its organization.
 *
 * @param ctx - Application context.
 * @param request - Incoming request, mutated with the resolved tenancy.
 * @param token - The presented key.
 * @throws {PocketError} `UNAUTHORIZED` when the key is unknown or revoked.
 */
async function authenticateApiKey(
  ctx: AppContext,
  request: FastifyRequest,
  token: string,
): Promise<void> {
  const org = await findOrganizationByApiKey(ctx.db, token);
  if (org === null) throw new PocketError('UNAUTHORIZED', 'The provided API key is not valid.');
  request.orgId = org.id;
  request.principal = 'api-key';
  request.userId = null;
}

/**
 * Resolves an identity token to its organization.
 *
 * @param ctx - Application context.
 * @param request - Incoming request, mutated with the resolved tenancy.
 * @param token - The presented session token.
 * @throws {PocketError} `UNAUTHORIZED` when the provider will not vouch for the
 *   token, or when it is valid but no organization has been provisioned for
 *   the subject yet. The second case is not an error the browser should retry
 *   blindly: it means `POST /v1/auth/session` has not run.
 */
async function authenticateSession(
  ctx: AppContext,
  request: FastifyRequest,
  token: string,
): Promise<void> {
  const identity = await ctx.identity.verify(token);
  const session = await findSession(ctx.db, identity.subject);
  if (session === null) {
    throw new PocketError('UNAUTHORIZED', 'No organization exists for this account yet.');
  }
  request.orgId = session.org.id;
  request.principal = 'session';
  request.userId = session.user.id;
}

/**
 * Registers the authentication hook.
 *
 * @param app - Fastify instance.
 * @param ctx - Application context, for database and identity access.
 * @remarks The hook runs on every request. A route that forgets to opt into
 * protection is still protected, because protection is the default.
 */
export function registerAuth(app: FastifyInstance, ctx: AppContext): void {
  app.addHook('onRequest', async (request) => {
    const routeKey = `${request.method}:${request.routeOptions.url ?? request.url}`;
    if (PUBLIC_ROUTES.has(routeKey)) return;

    const token = bearerToken(request);
    if (token === null) {
      throw new PocketError(
        'UNAUTHORIZED',
        'Provide an API key or session token as a bearer token.',
      );
    }

    if (token.startsWith(API_KEY_PREFIX)) {
      await authenticateApiKey(ctx, request, token);
      return;
    }
    await authenticateSession(ctx, request, token);
  });
}

/**
 * Refuses a request that did not come from a signed-in person.
 *
 * @param request - Authenticated request.
 * @throws {PocketError} `FORBIDDEN` when the caller is a machine.
 * @remarks Guards credential and tenancy management. An API key that leaks
 *   should let an attacker spend up to the policy ceiling and no further — it
 *   must not let them mint fresh keys or rename the organization.
 */
export function requireHuman(request: FastifyRequest): void {
  if (request.principal !== 'session') {
    throw new PocketError('FORBIDDEN', 'This action requires a signed-in user, not an API key.');
  }
}

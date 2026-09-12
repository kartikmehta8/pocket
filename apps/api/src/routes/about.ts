/**
 * What this service is, served from its own front door.
 *
 * `GET /` used to answer 404, which tells a visitor nothing and a reviewer
 * less. A financial service that decides who may spend what should be able to
 * say so in one request, without a key: what it does, what it refuses to do,
 * which build is running, and where the rest of it is.
 *
 * Nothing here is a secret. Every field is either the public API contract, the
 * vendor names already printed in the dashboard's own footer, or the version
 * of a public repository.
 */

import type { FastifyInstance } from 'fastify';
import { release } from '@pocket/core/release';
import type { AppContext } from '../context.js';

/** Version reported by this service. Matches `package.json`. */
const VERSION = '0.1.0';

/** Where the rest of the product lives. */
const LINKS = {
  product: 'https://www.pocket-app.xyz',
  documentation: 'https://docs.pocket-app.xyz/docs',
  protocol: 'https://x402.org',
  health: '/v1/health',
} as const;

/**
 * The promises the decision engine makes, in the order they are worth reading.
 *
 * @remarks Written as claims a reader can go and check rather than as
 * marketing. Each one corresponds to something the code does: the ordering of
 * the decision, the absence of a key on this side of the wire, and the fact
 * that a refusal is persisted rather than dropped.
 */
const GUARANTEES = [
  'Every payment is decided before a wallet is asked to sign, so a refused purchase has no signature attached to it.',
  'No private key reaches this service. Wallets are custodied elsewhere and only a signature crosses back.',
  'A refusal is recorded with the rule that stopped it and the room that was left, not discarded.',
  'Agents cannot change their own limits. Budgets and policies are written by a signed-in human or an organization key.',
  'Money is carried as decimal strings beside its asset, never as a JSON number.',
] as const;

/**
 * Registers the service description at `GET /`.
 *
 * @param app - Fastify instance.
 * @param ctx - Application context.
 * @param routes - Every route the server registered, as `METHOD /path`.
 * @remarks Registered last, once `routes` is populated. The list is collected
 * from Fastify rather than written out here, so an endpoint cannot be added to
 * the API and left out of its own index. `adapters` names which vendor is
 * answering for each thing Pocket deliberately does not do itself, and whether
 * it is the real one.
 *
 * The response is `no-store`: uptime and the running build change under the
 * reader's feet, and an intermediary holding a copy would answer confidently
 * with yesterday's.
 */
export function registerAboutRoute(
  app: FastifyInstance,
  ctx: AppContext,
  routes: readonly string[],
): void {
  app.get('/', (_request, reply) => {
    reply.header('cache-control', 'no-store');
    return {
      service: 'pocket-api',
      name: 'Pocket API',
      summary: 'Spending limits for AI agents.',
      description:
        'Pocket gives each AI agent its own wallet and a hard cap it cannot raise. This service ' +
        'holds the decision: it prices a purchase, checks it against the budget and policy the ' +
        'operator set, and only then asks a custodian to sign. Every attempt is recorded, ' +
        'including the ones it refused.',
      role: 'Policy engine, ledger and audit trail. The dashboard and the MCP server are both clients of this API.',
      guarantees: GUARANTEES,
      chain: ctx.config.CHAIN,
      adapters: ctx.modes,
      auth: {
        scheme: 'Bearer',
        credentials: [
          'pocket_sk_… — an organization API key, minted in the dashboard',
          'A Privy identity token, for a signed-in person',
        ],
        public: ['GET /', 'GET /v1/health', 'POST /v1/orgs', 'POST /v1/auth/session'],
        note: 'Everything else is scoped to the organization the credential belongs to.',
      },
      endpoints: routes,
      links: LINKS,
      release: release(VERSION),
    };
  });
}

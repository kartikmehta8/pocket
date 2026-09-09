/**
 * Server assembly.
 *
 * Building the app is separate from starting it, so tests can drive the whole
 * HTTP surface through `app.inject` without binding a port.
 */

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppContext } from './context.js';
import { registerAuth } from './auth.js';
import { registerErrorHandler } from './errors.js';
import { registerAgentRoutes } from './routes/agents.js';
import { registerApiKeyRoutes } from './routes/api-keys.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerAnalyticsRoutes } from './routes/analytics.js';
import { registerOrgRoutes } from './routes/orgs.js';
import { registerPaymentRoutes } from './routes/payments.js';
import { registerTaskBudgetRoutes } from './routes/task-budgets.js';
import { registerWalletRoutes } from './routes/wallets.js';
import { registerX402Routes } from './routes/x402.js';

/**
 * Replacer that renders any stray `bigint` as a string.
 *
 * @remarks The serialisers in `./serialize.js` are what produce correct
 * decimal money. This is only a safety net so a value that slips through
 * degrades to a readable string instead of crashing the response.
 */
function bigintSafe(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

/**
 * Builds the Fastify application.
 *
 * @param ctx - Application context carrying config, database and adapters.
 * @returns A configured, unstarted Fastify instance.
 */
export async function buildServer(ctx: AppContext): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: ctx.config.LOG_LEVEL,
      // Credentials must never reach a log line, in any environment.
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers["idempotency-key"]',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
        ],
        remove: true,
      },
    },
    trustProxy: true,
    bodyLimit: 256 * 1024,
  });

  app.setReplySerializer((payload) => JSON.stringify(payload, bigintSafe));

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: ctx.config.corsOrigins,
    credentials: true,
    allowedHeaders: ['content-type', 'authorization', 'idempotency-key', 'x-identity-token'],
  });
  await app.register(rateLimit, {
    max: ctx.config.RATE_LIMIT_MAX,
    timeWindow: '1 minute',
    // Rate limit per organization key rather than per IP, so one noisy agent
    // cannot exhaust the budget of every caller behind the same NAT.
    keyGenerator: (request) => request.headers.authorization ?? request.ip,
  });

  app.decorateRequest('orgId', '');
  app.decorateRequest('principal', 'api-key');
  app.decorateRequest('userId', null);

  registerErrorHandler(app);
  registerAuth(app, ctx);

  registerAuthRoutes(app, ctx);
  registerOrgRoutes(app, ctx);
  registerApiKeyRoutes(app, ctx);
  registerAgentRoutes(app, ctx);
  registerWalletRoutes(app, ctx);
  registerTaskBudgetRoutes(app, ctx);
  registerPaymentRoutes(app, ctx);
  registerX402Routes(app, ctx);
  registerAnalyticsRoutes(app, ctx);

  return app;
}

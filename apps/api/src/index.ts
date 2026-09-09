/**
 * API entry point.
 */

import { buildAdapters } from '@purse/adapters';
import { closeDb, getDb } from '@purse/db';
import { loadConfig } from './config.js';
import { buildServer } from './server.js';

/**
 * Starts the API and installs graceful shutdown.
 *
 * @throws {Error} When configuration is invalid or the port cannot be bound.
 *   Failing at startup is deliberate: a half-configured financial service
 *   should not accept traffic.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const db = getDb(config.DATABASE_URL);
  const adapters = buildAdapters({ ...process.env, CHAIN: config.CHAIN });

  const app = await buildServer({
    config,
    db,
    wallet: adapters.wallet,
    chain: adapters.chain,
    analytics: adapters.analytics,
    market: adapters.market,
    identity: adapters.identity,
    modes: adapters.modes,
  });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void (async () => {
        app.log.info('Shutting down');
        await app.close();
        await closeDb();
        process.exit(0);
      })();
    });
  }

  await app.listen({ port: config.PORT, host: config.HOST });
  app.log.info({ adapters: adapters.modes }, 'Purse API ready');
}

main().catch((error: unknown) => {
  process.stderr.write(`Failed to start Purse API: ${String(error)}\n`);
  process.exit(1);
});

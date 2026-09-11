/**
 * API entry point.
 */

import { buildAdapters } from '@pocket/adapters';
import { closeDb, getDb } from '@pocket/db';
import { loadConfig } from './config.js';
import { loadEnvFile } from '@pocket/core/env';
import { buildServer } from './server.js';

/**
 * Starts the API and installs graceful shutdown.
 *
 * @throws {Error} When configuration is invalid or the port cannot be bound.
 *   Failing at startup is deliberate: a half-configured financial service
 *   should not accept traffic.
 */
async function main(): Promise<void> {
  // Before anything reads configuration. Without it a service keeps whatever
  // environment its shell had when it started, so a variable added to `.env`
  // afterwards reads as unset for as long as that process lives.
  loadEnvFile();
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
  // Whether new agents will be funded is the difference between an operator
  // finishing the demo and being sent to a faucet, and it is decided entirely
  // by configuration. Saying so at startup turns a silent misconfiguration
  // into one line in the log.
  app.log.info(
    {
      adapters: adapters.modes,
      seeding:
        config.TREASURY_WALLET_ID === undefined
          ? 'off'
          : `${config.AGENT_SEED_AMOUNT} USDC from ${config.TREASURY_ADDRESS ?? 'unset'}`,
    },
    'Pocket API ready',
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`Failed to start Pocket API: ${String(error)}\n`);
  process.exit(1);
});

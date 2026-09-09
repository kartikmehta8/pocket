/**
 * The x402-gated seller.
 *
 * A standalone service that sells real data for real money. It knows nothing
 * about Pocket and holds no relationship with the buyer: it states a price, and
 * a facilitator verifies and settles the payment before the resource is
 * served. That independence is what makes the demo a purchase rather than a
 * simulation.
 *
 * Every feed is warmed before the port is bound. A feed whose upstream is
 * unreachable at startup is simply not offered, so this service never quotes a
 * price for something it cannot deliver.
 */

import Fastify from 'fastify';
import { paymentMiddleware } from '@x402/fastify';
import { HTTPFacilitatorClient, x402ResourceServer } from '@x402/core/server';
import type { RoutesConfig } from '@x402/core/server';
import { ExactHederaScheme } from '@x402/hedera/exact/server';
import { resolveHederaAccount } from '@pocket/adapters';
import { SourceCache } from './cache.js';
import { catalogStages, toBaseUnits } from './catalog.js';
import { loadSellerConfig } from './config.js';
import type { DataSource } from './sources/types.js';

const config = loadSellerConfig();
// Behind a reverse proxy the socket address is the proxy's, so without this
// every request looks like it came from the same client.
const app = Fastify({ logger: { level: config.LOG_LEVEL }, trustProxy: true });

const cache = new SourceCache((source, error) => {
  app.log.warn({ source, error: String(error) }, 'Upstream refresh failed');
});

/**
 * Resolves the payee.
 *
 * @returns The Hedera account id the seller is paid at.
 * @throws {Error} When the address has no Hedera account, which means it has
 *   never received a transfer and cannot be paid yet.
 * @remarks The x402 Hedera scheme addresses accounts by id, while wallets are
 *   provisioned by EVM address, so the translation happens once at startup
 *   rather than being pasted into configuration by hand.
 */
async function resolvePayee(): Promise<string> {
  const { accountId } = await resolveHederaAccount(
    config.HEDERA_MIRROR_URL,
    config.PAID_SERVICE_ADDRESS,
  );
  return accountId;
}

/**
 * Builds the x402 route configuration from the feeds that warmed.
 *
 * @param sources - Sellable feeds.
 * @param payTo - Hedera account id receiving payment.
 * @param baseUrl - Public base URL, used for the `resource` field.
 * @returns Route config keyed by `METHOD /path`.
 */
function buildRoutes(sources: readonly DataSource[], payTo: string, baseUrl: string): RoutesConfig {
  return Object.fromEntries(
    sources.map((source) => [
      `GET ${source.path}`,
      {
        accepts: {
          scheme: 'exact',
          network: config.X402_NETWORK,
          payTo,
          price: {
            asset: config.X402_ASSET,
            amount: toBaseUnits(source.price, config.X402_ASSET_DECIMALS),
          },
          maxTimeoutSeconds: 120,
        },
        resource: `${baseUrl}${source.path}`,
        description: source.description,
        mimeType: 'application/json',
      },
    ]),
  );
}

/** Renders one feed for the public catalog. Prices are quoted before purchase. */
function catalogEntry(source: DataSource) {
  const snapshot = cache.snapshot(source.id);
  return {
    path: source.path,
    title: source.title,
    description: source.description,
    useCase: source.useCase,
    provider: source.provider,
    price: source.price,
    asset: config.X402_ASSET,
    assetSymbol: config.X402_ASSET_SYMBOL,
    refreshSeconds: Math.round(source.ttlMs / 1000),
    asOf: snapshot?.asOf.toISOString() ?? null,
    stale: snapshot?.stale ?? true,
  };
}

async function main(): Promise<void> {
  const stages = catalogStages(cache, config);
  const [payTo, sellable] = await Promise.all([
    resolvePayee(),
    cache.warm([stages.raw, stages.composed]),
  ]);
  cache.start(sellable);

  const missing = [...stages.raw, ...stages.composed]
    .filter((source) => !sellable.includes(source))
    .map((source) => source.id);

  const baseUrl = config.PAID_SERVICE_PUBLIC_URL ?? `http://localhost:${config.PAID_SERVICE_PORT}`;
  const facilitator = new HTTPFacilitatorClient({ url: config.X402_FACILITATOR_URL });
  const server = new x402ResourceServer(facilitator).register(
    config.X402_NETWORK,
    new ExactHederaScheme(),
  );

  paymentMiddleware(app, buildRoutes(sellable, payTo, baseUrl), server);

  app.get('/health', () => ({
    ok: sellable.length > 0,
    network: config.X402_NETWORK,
    facilitator: config.X402_FACILITATOR_URL,
    asset: config.X402_ASSET,
    payTo,
    payToAddress: config.PAID_SERVICE_ADDRESS,
    resources: sellable.map((source) => source.path),
    // Named rather than hidden: a feed that could not warm is not for sale,
    // and a buyer comparing the catalog to the docs deserves to know why.
    unavailable: missing,
  }));

  app.get('/catalog', () => ({ resources: sellable.map(catalogEntry) }));

  for (const source of sellable) {
    // The middleware gates these: the handler only runs once the facilitator
    // has confirmed settlement. It reads from memory and cannot fail.
    app.get(source.path, () => {
      const snapshot = cache.snapshot(source.id);
      if (snapshot === null) throw new Error(`Feed ${source.id} vanished from the cache.`);
      return {
        result: snapshot.data,
        asOf: snapshot.asOf.toISOString(),
        stale: snapshot.stale,
        provider: source.provider,
      };
    });
  }

  await app.listen({ port: config.PAID_SERVICE_PORT, host: '0.0.0.0' });
  app.log.info(
    { payTo, resources: sellable.length, facilitator: config.X402_FACILITATOR_URL },
    'x402 seller ready',
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`Failed to start paid service: ${String(error)}\n`);
  process.exit(1);
});

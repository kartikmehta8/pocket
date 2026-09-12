/**
 * Test harness.
 *
 * Builds the real application against the real database and the deterministic
 * adapters, then gives each test its own organization so tests cannot see one
 * another's data.
 *
 * Rate limiting is raised because the concurrency tests fire hundreds of
 * requests on purpose; throttling them would prove nothing about the row lock
 * and everything about the rate limiter, which has tests of its own. Treasury
 * variables are cleared rather than inherited: a developer with a treasury in
 * their shell would otherwise have every suite that registers an agent quietly
 * spend real testnet money, and the results would depend on whose machine ran
 * them. `agent-seed.test.ts` opts back in through `h.config`.
 */

import {
  MockChainProvider,
  OpenIdentityVerifier,
  MockWalletProvider,
  LedgerAnalyticsProvider,
  StubMarketDataProvider,
} from '@pocket/adapters';
import { getDb, createOrganization, issueApiKey } from '@pocket/db';
import type { FastifyInstance } from 'fastify';
import { loadConfig, type Config } from '../src/config.js';
import { buildServer } from '../src/server.js';

/** A running app plus a fresh tenant to exercise it with. */
export interface Harness {
  app: FastifyInstance;
  apiKey: string;
  orgId: string;
  wallet: MockWalletProvider;
  chain: MockChainProvider;
  market: StubMarketDataProvider;
  auth: { authorization: string };
  /**
   * The live configuration this server is running on.
   *
   * @remarks Mutable on purpose, so a test can turn a deployment-shaped
   * setting such as the treasury on and off without standing up a server for
   * each case.
   */
  config: Config;
}

/**
 * Stands up the API with fake adapters and a fresh organization.
 *
 * @param options - `walletLive` declares the fake wallet provider live, which
 *   is what the facilitator-settled routes ask before they will run. The
 *   provider is still the deterministic one; only the mode it reports changes.
 * @returns The harness. Call `app.close()` when the suite finishes.
 */
export async function createHarness(options: { walletLive?: boolean } = {}): Promise<Harness> {
  const config = loadConfig({
    ...process.env,
    NODE_ENV: 'test',
    LOG_LEVEL: process.env['TEST_LOG_LEVEL'] ?? 'silent',
    DATABASE_URL:
      process.env['DATABASE_URL'] ?? 'postgres://pocket:pocket@localhost:5434/pocket_test',
    RATE_LIMIT_MAX: '100000',
    TREASURY_WALLET_ID: '',
    TREASURY_ADDRESS: '',
  });

  const db = getDb(config.DATABASE_URL);
  const wallet = new MockWalletProvider();
  const chain = new MockChainProvider('hedera-testnet');
  const market = new StubMarketDataProvider();

  const app = await buildServer({
    config,
    db,
    wallet,
    chain,
    analytics: new LedgerAnalyticsProvider(),
    market,
    identity: new OpenIdentityVerifier(),
    modes: {
      wallet: { provider: 'mock', live: options.walletLive === true },
      chain: { provider: 'mock', live: false },
      analytics: { provider: 'ledger', live: false },
      market: { provider: 'unpriced', live: false },
      identity: { provider: 'offline', live: false },
    },
  });

  const org = await createOrganization(db, `test-${Date.now()}-${Math.random()}`);
  const { plaintext: apiKey } = await issueApiKey(db, org.id, 'Test key');
  return {
    app,
    apiKey,
    orgId: org.id,
    wallet,
    chain,
    market,
    auth: { authorization: `Bearer ${apiKey}` },
    config,
  };
}

/** The address the tests treat as a trusted seller. */
export const SELLER = '0x000000000000000000000000000000000000dead';

/** An address no policy trusts. */
export const STRANGER = '0x0000000000000000000000000000000000fa11ed';

/**
 * Registers an agent with a budget and policy ready to spend.
 *
 * @param h - Test harness.
 * @param overrides - Policy fields to change from the permissive default.
 * @returns The agent identifier.
 */
export async function createFundedAgent(
  h: Harness,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const created = await h.app.inject({
    method: 'POST',
    url: '/v1/agents',
    headers: h.auth,
    payload: { name: 'Hermes' },
  });
  const agentId = created.json().agent.id;

  await h.app.inject({
    method: 'PUT',
    url: `/v1/agents/${agentId}/budget`,
    headers: h.auth,
    payload: { asset: 'USDC', dailyLimit: '20', perTransactionLimit: '2' },
  });

  await h.app.inject({
    method: 'PUT',
    url: `/v1/agents/${agentId}/policy`,
    headers: h.auth,
    payload: {
      allowedAssets: ['USDC'],
      allowedChains: ['hedera-testnet'],
      allowedCategories: ['research', 'data'],
      maxTransactionAmount: '2',
      trustedRecipients: [SELLER],
      unknownRecipientBehaviour: 'block',
      ...overrides,
    },
  });

  return agentId;
}

/** Builds a well-formed payment request body. */
export function paymentBody(agentId: string, overrides: Record<string, unknown> = {}) {
  return {
    agentId,
    amount: '0.08',
    asset: 'USDC',
    chain: 'hedera-testnet',
    recipient: SELLER,
    category: 'research',
    reason: 'Market intelligence for ETH ecosystem research',
    ...overrides,
  };
}

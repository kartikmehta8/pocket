/**
 * The application context: the collaborators every route handler needs.
 *
 * Handlers receive this rather than reaching for module-level singletons, so a
 * test can stand up the whole API against fake adapters without patching
 * globals.
 */

import type { AdapterMode } from '@purse/adapters';
import type {
  AnalyticsProvider,
  ChainProvider,
  IdentityVerifier,
  MarketDataProvider,
  WalletProvider,
} from '@purse/core';
import type { Database } from '@purse/db';
import type { Config } from './config.js';

/** Everything an HTTP handler is allowed to depend on. */
export interface AppContext {
  config: Config;
  db: Database;
  wallet: WalletProvider;
  chain: ChainProvider;
  analytics: AnalyticsProvider;
  market: MarketDataProvider;
  identity: IdentityVerifier;
  /** How each adapter slot resolved, surfaced by the health endpoint. */
  modes: {
    wallet: AdapterMode;
    chain: AdapterMode;
    analytics: AdapterMode;
    market: AdapterMode;
    identity: AdapterMode;
  };
}

declare module 'fastify' {
  interface FastifyRequest {
    /** The authenticated organization, set by the auth hook. */
    orgId: string;
    /**
     * How the caller proved who they are.
     *
     * @remarks `api-key` is a machine — an agent runtime or the MCP server.
     * `session` is a signed-in person. Routes that change credentials or
     * tenancy require a person, because a leaked agent key must not be able to
     * mint more keys for itself.
     */
    principal: 'api-key' | 'session';
    /** Signed-in user id, present only when `principal` is `session`. */
    userId: string | null;
  }
}

/**
 * Adapter selection.
 *
 * Pocket decides once, at startup, whether each vendor is live or mocked, based
 * only on whether its credentials are present. There is no runtime toggle: a
 * flag that could silently downgrade a money path to a fake one is a hazard,
 * not a feature.
 */

import type {
  AnalyticsProvider,
  ChainId,
  ChainProvider,
  IdentityVerifier,
  MarketDataProvider,
  WalletProvider,
} from '@pocket/core';
import { GraphAnalyticsProvider } from './graph.js';
import { GraphMarketDataProvider } from './graph-market.js';
import { HederaChainProvider } from './hedera.js';
import { OpenIdentityVerifier } from './identity-mocks.js';
import { UnpricedMarketDataProvider } from './market-mocks.js';
import { LedgerAnalyticsProvider, MockChainProvider } from './mocks.js';
import { MockWalletProvider } from './wallet-mocks.js';
import { PrivyWalletProvider } from './privy.js';
import { PrivyIdentityVerifier } from './privy-identity.js';

export * from './chains.js';
export * from './graph.js';
export * from './graph-market.js';
export * from './hedera.js';
export * from './hedera-account.js';
export * from './identity-mocks.js';
export * from './market-mocks.js';
export * from './mocks.js';
export * from './wallet-mocks.js';
export * from './privy.js';
export * from './privy-policy.js';
export * from './privy-provision.js';
export * from './privy-transactions.js';
export * from './privy-hedera-signer.js';
export * from './secp256k1-key.js';
export * from './privy-identity.js';

/** How one adapter slot resolved. */
export interface AdapterMode {
  /** The concrete implementation, for example `privy` or `mock`. */
  provider: string;
  /**
   * Whether this slot talks to the real vendor.
   *
   * @remarks Stated explicitly rather than inferred from the provider name. A
   * consumer guessing "not called mock, therefore live" would label the
   * `ledger` analytics fallback as live, which is exactly the kind of quiet
   * overstatement a financial dashboard must not make.
   */
  live: boolean;
}

/** Every adapter plus how each slot resolved. */
export interface Adapters {
  wallet: WalletProvider;
  chain: ChainProvider;
  analytics: AnalyticsProvider;
  market: MarketDataProvider;
  identity: IdentityVerifier;
  modes: {
    wallet: AdapterMode;
    chain: AdapterMode;
    analytics: AdapterMode;
    market: AdapterMode;
    identity: AdapterMode;
  };
}

/** Environment inputs that decide live versus mock. */
export interface AdapterEnv {
  PRIVY_APP_ID?: string | undefined;
  PRIVY_APP_SECRET?: string | undefined;
  PRIVY_AUTHORIZATION_PRIVATE_KEY?: string | undefined;
  PRIVY_POLICY_ID?: string | undefined;
  PRIVY_VERIFICATION_KEY?: string | undefined;
  HEDERA_RPC_URL?: string | undefined;
  GRAPH_SUBGRAPH_URL?: string | undefined;
  GRAPH_API_KEY?: string | undefined;
  GRAPH_TOKEN_API_URL?: string | undefined;
  GRAPH_TOKEN_API_JWT?: string | undefined;
  GRAPH_PRICE_SUBGRAPH_URL?: string | undefined;
  GRAPH_PRICE_NETWORK?: string | undefined;
  GRAPH_PRICE_TOLERANCE_BPS?: string | undefined;
  GRAPH_PRICE_USDC_CONTRACT?: string | undefined;
  GRAPH_PRICE_HBAR_CONTRACT?: string | undefined;
  GRAPH_PRICE_USDC_POOL?: string | undefined;
  GRAPH_PRICE_HBAR_POOL?: string | undefined;
  CHAIN?: string | undefined;
  USE_MOCK_ADAPTERS?: string | undefined;
}

function present(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Builds the adapter set for this process.
 *
 * @param env - Environment variables, injected rather than read globally so
 *   tests can construct any combination.
 * @returns Live adapters where credentials exist, deterministic fakes elsewhere.
 * @remarks Setting `USE_MOCK_ADAPTERS=true` forces every adapter to a fake.
 *   That is intended for tests and offline demos, and the mode is reported by
 *   the health endpoint so a live-looking dashboard cannot hide it.
 */
export function buildAdapters(env: AdapterEnv = process.env): Adapters {
  const chain = (env.CHAIN ?? 'hedera-testnet') as ChainId;
  const forceMock = env.USE_MOCK_ADAPTERS === 'true';

  const walletLive = !forceMock && present(env.PRIVY_APP_ID) && present(env.PRIVY_APP_SECRET);
  const wallet: WalletProvider = walletLive
    ? new PrivyWalletProvider({
        appId: env.PRIVY_APP_ID as string,
        appSecret: env.PRIVY_APP_SECRET as string,
        authorizationPrivateKey: env.PRIVY_AUTHORIZATION_PRIVATE_KEY,
        policyId: env.PRIVY_POLICY_ID,
      })
    : new MockWalletProvider();

  const chainLive = !forceMock && present(env.HEDERA_RPC_URL);
  const chainProvider: ChainProvider = chainLive
    ? new HederaChainProvider(chain)
    : new MockChainProvider(chain);

  const analyticsLive = !forceMock && present(env.GRAPH_SUBGRAPH_URL);
  const analytics: AnalyticsProvider = analyticsLive
    ? new GraphAnalyticsProvider({
        subgraphUrl: env.GRAPH_SUBGRAPH_URL as string,
        apiKey: env.GRAPH_API_KEY,
      })
    : new LedgerAnalyticsProvider();

  // Pricing needs BOTH Graph products, because the whole point is that they
  // check each other. One credential is not enough to turn it on.
  const marketLive =
    !forceMock &&
    present(env.GRAPH_TOKEN_API_JWT) &&
    present(env.GRAPH_PRICE_SUBGRAPH_URL) &&
    present(env.GRAPH_API_KEY);
  const market: MarketDataProvider = marketLive
    ? new GraphMarketDataProvider({
        tokenApiUrl: env.GRAPH_TOKEN_API_URL ?? 'https://api.pinax.network',
        tokenApiJwt: env.GRAPH_TOKEN_API_JWT as string,
        subgraphUrl: env.GRAPH_PRICE_SUBGRAPH_URL as string,
        subgraphApiKey: env.GRAPH_API_KEY as string,
        network: env.GRAPH_PRICE_NETWORK ?? 'mainnet',
        toleranceBps: Number(env.GRAPH_PRICE_TOLERANCE_BPS ?? '200'),
        contracts: {
          ...(present(env.GRAPH_PRICE_USDC_CONTRACT)
            ? { USDC: env.GRAPH_PRICE_USDC_CONTRACT }
            : {}),
          ...(present(env.GRAPH_PRICE_HBAR_CONTRACT)
            ? { HBAR: env.GRAPH_PRICE_HBAR_CONTRACT }
            : {}),
        },
        pools: {
          ...(present(env.GRAPH_PRICE_USDC_POOL) ? { USDC: env.GRAPH_PRICE_USDC_POOL } : {}),
          ...(present(env.GRAPH_PRICE_HBAR_POOL) ? { HBAR: env.GRAPH_PRICE_HBAR_POOL } : {}),
        },
      })
    : new UnpricedMarketDataProvider();

  // Human sign-in reuses the wallet application's credentials: one Privy app
  // both custodies the agents' wallets and authenticates the operators, so
  // there is no second set of keys to configure or leak.
  const identity: IdentityVerifier = walletLive
    ? new PrivyIdentityVerifier({
        appId: env.PRIVY_APP_ID as string,
        appSecret: env.PRIVY_APP_SECRET as string,
        verificationKey: env.PRIVY_VERIFICATION_KEY,
      })
    : new OpenIdentityVerifier();

  return {
    wallet,
    chain: chainProvider,
    analytics,
    market,
    identity,
    modes: {
      wallet: { provider: walletLive ? 'privy' : 'mock', live: walletLive },
      chain: { provider: chainLive ? 'hedera' : 'mock', live: chainLive },
      analytics: { provider: analyticsLive ? 'the-graph' : 'ledger', live: analyticsLive },
      market: { provider: marketLive ? 'the-graph' : 'unpriced', live: marketLive },
      identity: { provider: walletLive ? 'privy' : 'offline', live: walletLive },
    },
  };
}

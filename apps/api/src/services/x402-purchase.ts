/**
 * The autonomous purchase flow.
 *
 * This is the whole product in one function. A buyer asks for a resource, the
 * seller answers with an x402 payment requirement, Pocket decides whether that
 * money may be spent, and only if it may does the wallet sign. The signed
 * payload goes back to the seller, whose facilitator verifies and settles it.
 *
 * It lives in the API rather than in a client so there is exactly one
 * implementation. The MCP server and the dashboard both call this, which means
 * an agent and a person buying the same thing traverse the same policy code
 * and leave the same evidence.
 */

import type { ChainProvider, MarketDataProvider, PaymentRequest } from '@pocket/core';
import type { PrivyWalletProvider } from '@pocket/adapters';
import type { Database } from '@pocket/db';
import { decisionToJson, paymentToJson, type PaymentJson } from '../serialize.js';
import { parseResourceUrl } from './resource-url.js';
import { requestResource } from './x402-http.js';
import { keysForPurchase } from './x402-idempotency.js';
import { presentToSeller } from './x402-present.js';
import { authorizeX402Payment } from './x402.js';
import type { X402Requirements } from './x402-types.js';

/** Collaborators the purchase flow needs. */
export interface PurchaseDeps {
  db: Database;
  market: MarketDataProvider;
  wallet: PrivyWalletProvider;
  chain: ChainProvider;
  chainId: 'hedera-testnet' | 'hedera-mainnet';
  mirrorNodeUrl: string;
  /** Whether this deployment may fetch loopback and private addresses. */
  allowPrivateHosts: boolean;
}

/** What the buyer asked for. */
export interface PurchaseRequest {
  agentId: string;
  url: string;
  reason: string;
  category: PaymentRequest['category'];
  taskBudgetId?: string | undefined;
  /** Overrides the derived idempotency key, to buy the same thing twice on purpose. */
  purchaseId?: string | undefined;
  /** Who asked. Recorded so the audit trail distinguishes an agent from a person. */
  initiatedBy: 'agent' | 'human';
}

/** What happened. Every outcome is a normal return, never an exception. */
export type PurchaseOutcome =
  | { status: 'free'; result: unknown }
  | {
      status: 'paid';
      result: unknown;
      payment: PaymentJson;
      settlement: Record<string, unknown> | null;
    }
  | {
      status: 'blocked';
      payment: PaymentJson;
      decision: Record<string, unknown>;
      requirement: X402Requirements;
    }
  /**
   * The same attempt reaching us twice: the first one already paid. Reported
   * apart from `blocked` because nothing refused it, and apart from `paid`
   * because the seller's response body was never retained and cannot be
   * served again without paying a second time.
   */
  | { status: 'replayed'; payment: PaymentJson }
  | { status: 'failed'; message: string; code: string; payment?: PaymentJson };

/**
 * Fetches a resource, paying for it through Pocket if the seller demands it.
 *
 * @param deps - Database, wallet, market data and deployment policy.
 * @param orgId - Tenant scope.
 * @param request - Agent, resource URL and spending context.
 * @returns Served free, paid and served, blocked by policy, or failed. A block
 *   is a normal outcome carrying the decision, so the caller can choose a
 *   cheaper provider rather than retrying blindly.
 * @throws {PocketError} Only for a malformed or refused URL, which is a caller
 *   error rather than an outcome of the purchase.
 */
export async function purchaseResource(
  deps: PurchaseDeps,
  orgId: string,
  request: PurchaseRequest,
): Promise<PurchaseOutcome> {
  const url = parseResourceUrl(request.url, deps.allowPrivateHosts);

  let first;
  try {
    first = await requestResource(url);
  } catch (cause) {
    return {
      status: 'failed',
      code: 'UPSTREAM_UNAVAILABLE',
      message: `Could not reach the resource: ${String(cause)}`,
    };
  }

  if (first.kind === 'error') {
    return {
      status: 'failed',
      code: 'UPSTREAM_UNAVAILABLE',
      message: `The seller answered ${first.status}: ${first.detail}`,
    };
  }
  // Nothing to authorise. A free resource is not a payment, so it leaves no
  // payment row and consumes no budget.
  if (first.kind === 'free') return { status: 'free', result: first.body };

  const requirement = first.challenge.accepts[0];
  if (requirement === undefined) {
    return { status: 'failed', code: 'UPSTREAM_UNAVAILABLE', message: 'No acceptable terms.' };
  }

  const keys = keysForPurchase(
    request.purchaseId,
    [request.agentId, url.toString(), request.taskBudgetId ?? '', requirement.amount],
    requirement.maxTimeoutSeconds,
  );

  const authorized = await authorizeX402Payment(
    {
      db: deps.db,
      market: deps.market,
      wallet: deps.wallet,
      chain: deps.chainId,
      mirrorNodeUrl: deps.mirrorNodeUrl,
    },
    orgId,
    keys,
    {
      agentId: request.agentId,
      requirements: requirement,
      resource: url.toString(),
      reason: request.reason,
      category: request.category,
      ...(request.taskBudgetId === undefined ? {} : { taskBudgetId: request.taskBudgetId }),
      decimals: 6,
      initiatedBy: request.initiatedBy,
    },
  );

  const explorer = (hash: string): string => deps.chain.explorerUrl(hash) ?? '';
  const payment = paymentToJson(authorized.payment, explorer);

  // A retry of an attempt that already paid. Not a refusal: the money moved,
  // and reporting it as blocked would tell an agent its policy stopped a
  // payment that in fact succeeded.
  if (authorized.replayed) {
    return { status: 'replayed', payment };
  }

  // Pocket refused, or held it for a human. Either way nothing was signed, so
  // there is no payload to present and the seller is never contacted again.
  if (authorized.paymentPayload === null) {
    return {
      status: 'blocked',
      payment,
      decision: decisionToJson(authorized.decision, authorized.payment.asset),
      requirement,
    };
  }

  return await presentToSeller(
    { db: deps.db, orgId, paymentId: authorized.payment.id, explorer },
    url,
    authorized.paymentPayload,
  );
}

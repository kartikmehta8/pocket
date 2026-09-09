/**
 * x402 authorization.
 *
 * This is where Pocket's guarantee lives in the facilitator-settled flow. The
 * policy and budget engines run **before** anything is signed, so an agent
 * cannot produce a payable transaction for a payment Pocket would refuse. Only
 * after an allow does the Privy-custodied wallet sign, and even then the
 * signature is a partially-signed transaction the facilitator must co-sign and
 * submit. Pocket never broadcasts and never holds a key.
 */

import { assetForTokenId, createPrivyHederaSigner, PrivyWalletProvider } from '@pocket/adapters';
import {
  PocketError,
  newId,
  type MarketDataProvider,
  type AuthorizationDecision,
  type ChainId,
  type Payment,
  type PaymentRequest,
} from '@pocket/core';
import {
  appendAuditEvent,
  chargeTaskBudget,
  findByIdempotencyKey,
  insertPayment,
  lockAgent,
  type Database,
} from '@pocket/db';
import { decisionToJson } from '../serialize.js';
import { keyToRetain, statusFor } from './x402-record.js';
import { decide, loadAuthorizationContext } from './authorization.js';
import { buildX402Request } from './x402-request.js';
import { priceIfRequired } from './pricing.js';
import { type X402PaymentPayload, type X402Requirements } from './x402-types.js';

/** Collaborators the x402 authorizer needs. */
export interface X402Deps {
  db: Database;
  market: MarketDataProvider;
  wallet: PrivyWalletProvider;
  chain: ChainId;
  mirrorNodeUrl: string;
}

/** Result of authorizing an x402 payment. */
export interface X402Authorization {
  payment: Payment;
  decision: AuthorizationDecision;
  /** The signed payload, present only when the decision allowed the payment. */
  paymentPayload: X402PaymentPayload | null;
  replayed: boolean;
}

/**
 * Authorizes an x402 payment and, if permitted, signs it.
 *
 * @param deps - Database, Privy wallet provider and chain configuration.
 * @param orgId - Tenant scope.
 * @param idempotencyKeys - Keys this attempt will accept a match on, most
 *   specific first. A match returns the original payment instead of paying
 *   again; the first key is the one a new payment is recorded under.
 * @param input - Agent, the seller's requirements, and the spending context.
 * @returns The recorded payment, the decision, and the signed payload when allowed.
 * @throws {PocketError} `VALIDATION_FAILED` when the seller's asset is not one
 *   Pocket is configured for, or `WALLET_NOT_PROVISIONED` when the agent has no wallet.
 */
export async function authorizeX402Payment(
  deps: X402Deps,
  orgId: string,
  idempotencyKeys: readonly string[],
  input: {
    agentId: string;
    requirements: X402Requirements;
    resource: string;
    reason: string;
    category: PaymentRequest['category'];
    taskBudgetId?: string | undefined;
    decimals: number;
    /**
     * Who asked. Recorded on the payment and the audit entry, and the only
     * thing distinguishing a dashboard purchase from an agent's afterwards —
     * both run identical policy code.
     */
    initiatedBy?: 'agent' | 'human';
  },
): Promise<X402Authorization> {
  const asset = assetForTokenId(deps.chain, input.requirements.asset);
  if (asset === null) {
    throw new PocketError(
      'VALIDATION_FAILED',
      'The seller asked to be paid in an asset Pocket is not configured for.',
      { asset: input.requirements.asset },
    );
  }

  const { request } = await buildX402Request(deps, asset, input);

  const existing = await findByIdempotencyKey(deps.db, orgId, idempotencyKeys);
  if (existing !== null) {
    const context = await loadAuthorizationContext(deps.db, orgId, request);
    return {
      payment: existing,
      decision: decide(context, request),
      paymentPayload: null,
      replayed: true,
    };
  }

  const initiatedBy = input.initiatedBy ?? 'agent';

  const { payment, decision, wallet } = await deps.db.transaction(async (tx) => {
    await lockAgent(tx, request.agentId);
    const context = await loadAuthorizationContext(tx, orgId, request);
    const priced = await priceIfRequired(deps.market, context.policy, context.amount, asset);
    const verdict = decide(context, request, priced.usdCents);
    const status = statusFor(verdict.outcome);

    const row = await insertPayment(tx, {
      id: newId('pay'),
      orgId,
      agentId: request.agentId,
      taskBudgetId: request.taskBudgetId ?? null,
      idempotencyKey: keyToRetain(status, idempotencyKeys),
      amount: context.amount,
      asset,
      chain: deps.chain,
      recipient: request.recipient,
      category: request.category,
      reason: request.reason,
      resource: input.resource,
      initiatedBy,
      status,
      denialCode: verdict.primaryDenialCode,
      decision: decisionToJson(verdict, asset),
      txHash: null,
    });

    if (status !== 'blocked' && context.taskBudget !== null) {
      await chargeTaskBudget(tx, context.taskBudget.id, context.amount);
    }

    await appendAuditEvent(tx, {
      orgId,
      actorType: initiatedBy,
      actorId: request.agentId,
      action: `payment.${status}`,
      subjectType: 'payment',
      subjectId: row.id,
      payload: {
        flow: 'x402',
        amount: request.amount,
        asset,
        payTo: request.recipient,
        resource: input.resource,
        outcome: verdict.outcome,
        violations: verdict.violations.map((violation) => violation.code),
        ...(priced.quotes.length > 0 ? { priceQuotes: priced.quotes } : {}),
        ...(priced.reason === undefined ? {} : { pricingIssue: priced.reason }),
      },
    });

    return { payment: row, decision: verdict, wallet: context.wallet };
  });

  // Only an outright allow produces a signed payload. A payment awaiting a
  // human must not become payable, or the approval step would be decorative.
  if (payment.status !== 'approved') {
    return { payment, decision, paymentPayload: null, replayed: false };
  }
  if (wallet === null) {
    throw new PocketError('WALLET_NOT_PROVISIONED', 'Agent has no wallet to pay from.');
  }

  const signer = await createPrivyHederaSigner({
    signDigest: (walletId, digest) => deps.wallet.signDigest(walletId, digest),
    walletId: wallet.providerWalletId,
    evmAddress: wallet.address,
    network: input.requirements.network,
    mirrorNodeUrl: deps.mirrorNodeUrl,
  });

  const transaction = await signer.createPartiallySignedTransferTransaction({
    network: input.requirements.network,
    amount: input.requirements.amount,
    payTo: input.requirements.payTo,
    asset: input.requirements.asset,
    extra: input.requirements.extra ?? undefined,
  });

  return {
    payment,
    decision,
    paymentPayload: { x402Version: 2, accepted: input.requirements, payload: { transaction } },
    replayed: false,
  };
}

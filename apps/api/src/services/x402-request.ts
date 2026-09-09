/**
 * Translating a seller's x402 requirement into a Pocket payment request.
 *
 * The two systems name the same counterparty differently: x402 addresses
 * Hedera accounts by id, while every policy in Pocket is written against EVM
 * addresses. Resolving to one canonical identity here means a trusted-recipient
 * list keeps working no matter which name the seller advertised.
 */

import { resolveHederaAccount } from '@pocket/adapters';
import type { AssetId, ChainId, PaymentRequest } from '@pocket/core';
import { toDecimal, type X402Requirements } from './x402-types.js';

/** The resolved payee, in both names Hedera uses for it. */
export interface ResolvedPayee {
  accountId: string;
  evmAddress: string;
}

/**
 * Builds the payment request the decision engines evaluate.
 *
 * @param deps - Chain identity and mirror node endpoint.
 * @param asset - Pocket asset ticker the seller's token resolved to.
 * @param input - The seller's requirements plus the spending context.
 * @returns The request and the resolved payee.
 */
export async function buildX402Request(
  deps: { chain: ChainId; mirrorNodeUrl: string },
  asset: AssetId,
  input: {
    agentId: string;
    requirements: X402Requirements;
    resource: string;
    reason: string;
    category: PaymentRequest['category'];
    taskBudgetId?: string | undefined;
    decimals: number;
  },
): Promise<{ request: PaymentRequest; payee: ResolvedPayee }> {
  const resolved = await resolveHederaAccount(deps.mirrorNodeUrl, input.requirements.payTo);
  const payee: ResolvedPayee = {
    accountId: resolved.accountId,
    evmAddress: resolved.evmAddress,
  };

  return {
    payee,
    request: {
      agentId: input.agentId,
      amount: toDecimal(input.requirements.amount, input.decimals),
      asset,
      chain: deps.chain,
      recipient: payee.evmAddress,
      category: input.category,
      reason: input.reason,
      initiatedBy: 'agent',
      resource: input.resource,
      ...(input.taskBudgetId === undefined ? {} : { taskBudgetId: input.taskBudgetId }),
    },
  };
}

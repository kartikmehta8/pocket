/**
 * Wallet operations that are not payments.
 *
 * Right now that means token association, which exists because Hedera is
 * unlike other EVM chains: an account cannot receive a token it has not opted
 * into. Making that an explicit, auditable action is better than letting a
 * transfer revert on chain with no explanation.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PocketError, assetSchema, type ChainId } from '@pocket/core';
import { appendAuditEvent, getAgentBundle } from '@pocket/db';
import type { AppContext } from '../context.js';

/** Body accepted when opting an agent wallet into holding a token. */
const associateSchema = z.object({ asset: assetSchema });

/**
 * Registers wallet routes.
 *
 * @param app - Fastify instance.
 * @param ctx - Application context.
 */
export function registerWalletRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post<{ Params: { id: string } }>('/v1/agents/:id/wallet/associate', async (request) => {
    const body = associateSchema.parse(request.body ?? {});
    const bundle = await getAgentBundle(ctx.db, request.orgId, request.params.id);
    if (bundle === null) throw new PocketError('NOT_FOUND', 'Agent not found.');
    if (bundle.wallet === null) {
      throw new PocketError('WALLET_NOT_PROVISIONED', 'Agent has no wallet to associate.');
    }

    // Associating twice reverts on chain, so check first rather than spending
    // gas to discover it.
    const already = await ctx.chain.isTokenAssociated(bundle.wallet.address, body.asset);
    if (already === true) {
      return { asset: body.asset, associated: true, txHash: null, alreadyAssociated: true };
    }

    const submitted = await ctx.wallet.associateToken({
      providerWalletId: bundle.wallet.providerWalletId,
      address: bundle.wallet.address,
      asset: body.asset,
      chain: bundle.wallet.chain as ChainId,
      idempotencyKey: `associate:${bundle.wallet.id}:${body.asset}`,
    });

    await appendAuditEvent(ctx.db, {
      orgId: request.orgId,
      actorType: 'human',
      action: 'wallet.associated',
      subjectType: 'agent',
      subjectId: request.params.id,
      payload: { asset: body.asset, txHash: submitted?.txHash ?? null },
    });

    // A native asset needs no association, so `null` back from the provider is
    // success rather than a no-op the caller has to interpret.
    return {
      asset: body.asset,
      associated: true,
      txHash: submitted?.txHash ?? null,
      alreadyAssociated: false,
    };
  });
}

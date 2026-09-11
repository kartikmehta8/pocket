/**
 * Wallet operations that are not payments.
 *
 * Two, both Hedera peculiarities. Token association exists because an account
 * cannot receive a token it has not opted into, and account completion because
 * an account created by a transfer carries no key until it signs something.
 * Making each an explicit, auditable action is better than letting a transfer
 * revert on chain, or a faucet refuse, with no explanation.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PocketError, assetSchema, type ChainId } from '@pocket/core';
import { appendAuditEvent, getAgentBundle } from '@pocket/db';
import { readHederaAccountState } from '@pocket/adapters';
import { awaitKeyPublished } from '../services/agent-chain.js';
import { topUpIfEmpty } from '../services/agent-seed.js';
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

  app.post<{ Params: { id: string } }>('/v1/agents/:id/wallet/activate', async (request) => {
    const bundle = await getAgentBundle(ctx.db, request.orgId, request.params.id);
    if (bundle === null) throw new PocketError('NOT_FOUND', 'Agent not found.');
    if (bundle.wallet === null) {
      throw new PocketError('WALLET_NOT_PROVISIONED', 'Agent has no wallet to activate.');
    }

    // `readAccount` answers `null` for both "no account" and "could not read",
    // so ask the chain directly here. Telling an operator to go and fund a
    // wallet that is already funded, because a mirror node was briefly down,
    // is worse than admitting the read failed.
    const account = await readHederaAccountState(
      ctx.config.HEDERA_MIRROR_URL,
      bundle.wallet.address,
    );
    if (account === null) {
      throw new PocketError(
        'VALIDATION_FAILED',
        'This wallet has no Hedera account yet. Send it a little HBAR first: the transfer is what brings the account into existence.',
        { address: bundle.wallet.address },
      );
    }

    // Signing costs gas, and a wallet seeded by Pocket holds only USDC. Left
    // to Privy this surfaces as `transaction_broadcast_failure`, which tells
    // an operator nothing they can act on — so the shortfall is named here,
    // before anything is attempted.
    if (!account.keyPublished) {
      const gas = await ctx.chain.getBalance(bundle.wallet.address, 'HBAR').catch(() => null);
      if (gas === 0n) {
        throw new PocketError(
          'VALIDATION_FAILED',
          'Publishing the key is a signed transaction, and this wallet has no HBAR to pay for it. Get some from Hedera’s faucet, then try again. The agent still never spends HBAR: this is only for the signature.',
          { address: bundle.wallet.address },
        );
      }
    }

    // Signing again would cost gas to achieve nothing. The key is published
    // once and stays published.
    if (account.keyPublished) {
      return {
        accountId: account.accountId,
        activated: false,
        txHash: null,
        alreadyActive: true,
        confirmed: true,
        seed: await topUpIfEmpty(ctx, request.orgId, request.params.id, bundle.wallet, request.log),
      };
    }

    const submitted = await ctx.wallet.completeAccount({
      providerWalletId: bundle.wallet.providerWalletId,
      address: bundle.wallet.address,
      chain: bundle.wallet.chain as ChainId,
      idempotencyKey: `activate:${bundle.wallet.id}`,
    });

    await appendAuditEvent(ctx.db, {
      orgId: request.orgId,
      actorType: 'human',
      action: 'wallet.activated',
      subjectType: 'agent',
      subjectId: request.params.id,
      payload: { accountId: account.accountId, txHash: submitted?.txHash ?? null },
    });

    // Hold the response until the change is readable. The caller's whole
    // reason for asking is to re-read the account afterwards, and a mirror
    // node that has not indexed the signature yet would tell it the account is
    // still hollow — so it would report that nothing happened.
    const confirmed = await awaitKeyPublished(ctx, bundle.wallet);

    return {
      accountId: account.accountId,
      activated: true,
      txHash: submitted?.txHash ?? null,
      alreadyActive: false,
      confirmed,
      seed: await topUpIfEmpty(ctx, request.orgId, request.params.id, bundle.wallet, request.log),
    };
  });
}

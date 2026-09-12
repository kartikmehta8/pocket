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
  /**
   * `POST /v1/agents/:id/wallet/associate` — opts a wallet into holding a token.
   *
   * Hedera requires an account to opt into a token before it can receive one.
   * Association is checked before it is attempted, because associating twice
   * reverts on chain and discovering that costs gas.
   *
   * A native asset needs no association at all, so `null` back from the provider
   * is success rather than a no-op the caller has to interpret.
   */
  app.post<{ Params: { id: string } }>('/v1/agents/:id/wallet/associate', async (request) => {
    const body = associateSchema.parse(request.body ?? {});
    const bundle = await getAgentBundle(ctx.db, request.orgId, request.params.id);
    if (bundle === null) throw new PocketError('NOT_FOUND', 'Agent not found.');
    if (bundle.wallet === null) {
      throw new PocketError('WALLET_NOT_PROVISIONED', 'Agent has no wallet to associate.');
    }

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

    return {
      asset: body.asset,
      associated: true,
      txHash: submitted?.txHash ?? null,
      alreadyAssociated: false,
    };
  });

  /**
   * `POST /v1/agents/:id/wallet/activate` — publishes the wallet's public key.
   *
   * An account created by an incoming transfer is hollow: it has an id and a
   * balance but has never signed anything, so the network cannot see its key.
   * Pocket can still pay from it, but outside services cannot, and some faucets
   * refuse to send while reporting success. Signing a transfer of nothing to
   * itself publishes the key and completes the account.
   *
   * The account is read from the chain directly rather than through
   * `readAccount`, which answers `null` both for "no account" and for "could not
   * read". Telling an operator to fund a wallet that is already funded, because a
   * mirror node was briefly down, is worse than admitting the read failed.
   *
   * The HBAR shortfall is named before anything is attempted. Signing costs gas, a
   * wallet Pocket seeded holds only USDC, and left to Privy this surfaces as
   * `transaction_broadcast_failure` — which tells an operator nothing they can act
   * on. An already-published key returns early, because signing again would cost
   * gas to achieve nothing.
   *
   * The response is held until the change is readable. The caller's whole reason
   * for asking is to re-read the account afterwards, and a mirror node that has
   * not indexed the signature yet would report that nothing happened.
   */
  app.post<{ Params: { id: string } }>('/v1/agents/:id/wallet/activate', async (request) => {
    const bundle = await getAgentBundle(ctx.db, request.orgId, request.params.id);
    if (bundle === null) throw new PocketError('NOT_FOUND', 'Agent not found.');
    if (bundle.wallet === null) {
      throw new PocketError('WALLET_NOT_PROVISIONED', 'Agent has no wallet to activate.');
    }

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

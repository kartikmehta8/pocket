/**
 * Moving an agent's balance to another agent.
 *
 * Exists so an agent can be retired without stranding what is in its wallet.
 * This is a treasury movement between two wallets the organization already
 * custodies, not a purchase: no policy governs it, no budget is drawn down,
 * and nothing about it belongs in the payment ledger. It is recorded in the
 * audit trail, with the transaction hash, like every other thing a person does.
 */

import { randomUUID } from 'node:crypto';
import { PocketError, type AssetId, type ChainId } from '@pocket/core';
import { appendAuditEvent, type AgentBundle } from '@pocket/db';
import type { AppContext } from '../context.js';
import { money } from '../serialize.js';

/** What a completed transfer reports back. */
export interface TransferResult {
  /** Decimal amount moved. */
  amount: string;
  asset: string;
  txHash: string;
  explorerUrl: string | null;
}

/**
 * Reads an agent's wallet, refusing clearly when it has none.
 *
 * @param bundle - The agent bundle.
 * @param role - How to name this side in the error, for example `source`.
 * @returns The wallet.
 * @throws {PocketError} `WALLET_NOT_PROVISIONED` when there is nothing to send
 *   from or receive into.
 */
function walletOf(bundle: AgentBundle, role: string) {
  if (bundle.wallet === null) {
    throw new PocketError(
      'WALLET_NOT_PROVISIONED',
      `The ${role} agent has no wallet, so there is nothing to move ${role === 'source' ? 'from' : 'to'}.`,
      { agentId: bundle.agent.id },
    );
  }
  return bundle.wallet;
}

/**
 * Moves an agent's entire balance of one asset to another agent's wallet.
 *
 * @param ctx - Application context.
 * @param orgId - Tenant scope. Both agents are already checked against it.
 * @param from - The agent being emptied.
 * @param to - The agent receiving the funds.
 * @param asset - Asset to move, defaulting to USDC.
 * @returns What moved, and the transaction that moved it.
 * @throws {PocketError} When either side has no wallet, when the two are the
 *   same agent, or when the balance is zero.
 * @remarks The balance is read immediately before the transfer and the whole
 *   of it is sent. A partial sweep would leave dust behind and defeat the only
 *   reason this exists. The idempotency key is unique per attempt: a failed
 *   transfer must be retryable, and the provider replays a reused key forever.
 */
export async function transferAgentFunds(
  ctx: AppContext,
  orgId: string,
  from: AgentBundle,
  to: AgentBundle,
  asset: AssetId = 'USDC',
): Promise<TransferResult> {
  if (from.agent.id === to.agent.id) {
    throw new PocketError('VALIDATION_FAILED', 'Choose a different agent to move the funds to.');
  }

  const source = walletOf(from, 'source');
  const target = walletOf(to, 'destination');

  const balance = await ctx.chain.getBalance(source.address, asset);
  if (balance <= 0n) {
    throw new PocketError(
      'INSUFFICIENT_BALANCE',
      `${from.agent.name} holds no ${asset}, so there is nothing to move.`,
      { agentId: from.agent.id, asset },
    );
  }

  const submitted = await ctx.wallet.sendPayment({
    providerWalletId: source.providerWalletId,
    from: source.address,
    to: target.address,
    amount: balance,
    asset,
    chain: source.chain as ChainId,
    idempotencyKey: `transfer:${from.agent.id}:${randomUUID()}`,
  });

  const amount = money(balance, asset);
  await appendAuditEvent(ctx.db, {
    orgId,
    actorType: 'human',
    action: 'wallet.transferred',
    subjectType: 'agent',
    subjectId: from.agent.id,
    payload: {
      asset,
      amount,
      toAgentId: to.agent.id,
      toAgent: to.agent.name,
      toAddress: target.address,
      txHash: submitted.txHash,
    },
  });

  return {
    amount,
    asset,
    txHash: submitted.txHash,
    explorerUrl: ctx.chain.explorerUrl(submitted.txHash),
  };
}

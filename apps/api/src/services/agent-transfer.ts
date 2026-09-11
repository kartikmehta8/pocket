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
 * Refuses before broadcasting when the sender cannot pay for the transaction.
 *
 * @param ctx - Application context.
 * @param name - The sending agent, for the message.
 * @param address - Its wallet address.
 * @throws {PocketError} `CONFLICT` when the wallet holds no gas.
 * @remarks An agent wallet routinely holds no HBAR. Purchases go through the
 * x402 facilitator, which pays the gas, which is the whole reason an agent
 * needs no native token to transact. A direct wallet-to-wallet transfer has no
 * facilitator behind it, so the sender pays, and a wallet with nothing to pay
 * with fails inside Privy as `transaction_broadcast_failure` — which tells an
 * operator nothing they can act on. The shortfall is named here instead.
 *
 * Only a definite zero refuses. A balance that could not be read is not a
 * balance of nothing, and blocking on an unreachable node would turn a chain
 * hiccup into an agent that cannot be retired.
 */
async function assertCanSend(ctx: AppContext, name: string, address: string): Promise<void> {
  const gas = await ctx.chain.getBalance(address, 'HBAR').catch(() => null);
  if (gas !== 0n) return;
  throw new PocketError(
    'CONFLICT',
    `${name} has no HBAR to pay for the transfer. Send a little to its wallet and try again — it is only for the transaction fee, and the agent never spends it.`,
    { address },
  );
}

/**
 * Refuses before broadcasting when the recipient cannot hold the asset.
 *
 * @param ctx - Application context.
 * @param name - The receiving agent, for the message.
 * @param address - Its wallet address.
 * @param asset - The asset being moved.
 * @throws {PocketError} `TOKEN_NOT_ASSOCIATED` when the wallet has not opted
 *   into the token.
 * @remarks Hedera accounts opt into every token they hold, and a transfer to
 * one that has not opted in reverts. An agent that has never been funded has
 * no account at all, which reads the same way here.
 *
 * `null` means the question does not apply to this chain, and an unreadable
 * answer is not a refusal, so only an explicit `false` stops the transfer.
 */
async function assertCanReceive(
  ctx: AppContext,
  name: string,
  address: string,
  asset: AssetId,
): Promise<void> {
  const associated = await ctx.chain.isTokenAssociated(address, asset).catch(() => null);
  if (associated !== false) return;
  throw new PocketError(
    'TOKEN_NOT_ASSOCIATED',
    `${name} cannot hold ${asset} yet. Fund that agent once, which opts its wallet into the token, then move the balance.`,
    { address, asset },
  );
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

  await assertCanSend(ctx, from.agent.name, source.address);
  await assertCanReceive(ctx, to.agent.name, target.address, asset);

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

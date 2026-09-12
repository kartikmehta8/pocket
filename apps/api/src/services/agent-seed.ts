/**
 * Putting a little USDC in a new agent's wallet.
 *
 * A freshly provisioned agent can do nothing. Its wallet has no balance, so
 * its Hedera account does not exist yet, and the operator's next move is a
 * third-party faucet that may rate-limit them, refuse them, or claim success
 * and send nothing. That is a poor first five minutes, and none of it is about
 * Pocket.
 *
 * So Pocket seeds the wallet itself from a treasury it controls. The transfer
 * also brings the Hedera account into existence and auto-associates the token,
 * so the *agent* never needs HBAR: the x402 facilitator pays its gas, and
 * Pocket holds the wallet's public key from provisioning, so a hollow account
 * settles like any other.
 *
 * The treasury does need HBAR, because this transfer is an ordinary EVM call
 * that it pays for itself.
 */

import { randomUUID } from 'node:crypto';
import { decimalsOf, parseAmount, type ChainId } from '@pocket/core';
import { appendAuditEvent } from '@pocket/db';
import { money } from '../serialize.js';
import type { AppContext } from '../context.js';

/** The asset a new agent is seeded with, and the one the demo spends. */
const SEED_ASSET = 'USDC';

/** What a seeding attempt did, for the caller to report. */
export interface SeedResult {
  /** Amount actually sent, as a decimal string, or `null` if nothing was. */
  amount: string | null;
  /** The transfer, or `null` when seeding is off or did not succeed. */
  txHash: string | null;
}

/** Nothing was sent, and nothing went wrong. */
const NOT_SEEDED: SeedResult = { amount: null, txHash: null };

/** The one logging call this service makes, so it need not know Fastify. */
export interface SeedLogger {
  warn(context: Record<string, unknown>, message: string): void;
}

/**
 * Sends a new agent enough USDC to complete the demo.
 *
 * @param ctx - Application context.
 * @param orgId - The organization the agent belongs to.
 * @param agentId - The agent the wallet belongs to, for the audit trail.
 * @param wallet - The freshly provisioned wallet.
 * @param log - Where to record a treasury that could not pay.
 * @returns What was sent, or nothing.
 * @remarks Never throws. Registering an agent is the operator's action and it
 * has already succeeded by the time this runs; failing it because a treasury
 * is empty or a relay is slow would destroy work to report a shortfall the
 * funding step already explains. A failure leaves the agent exactly as it
 * would have been without a treasury configured.
 *
 * The amount is parsed inside the guard rather than above it. Configuration is
 * validated at boot, but a parse that threw here would escape a function whose
 * whole contract is that it cannot — and it would do so after the agent already
 * exists.
 *
 * The idempotency key is unique per attempt. Keyed to the agent instead, the
 * provider replays the first outcome for that key forever, so a treasury that
 * was empty at registration could never fund that agent again even once
 * refilled. At-most-once is enforced where it belongs: registration seeds
 * exactly once, and the top-up path checks the balance before it pays. A
 * failure is worth a log line and nothing more, because an empty treasury is an
 * operational fact about the deployment rather than a fault in the request.
 */
export async function seedAgentWallet(
  ctx: AppContext,
  orgId: string,
  agentId: string,
  wallet: { address: string; chain: string },
  log: SeedLogger,
): Promise<SeedResult> {
  const walletId = ctx.config.TREASURY_WALLET_ID;
  const from = ctx.config.TREASURY_ADDRESS;
  if (walletId === undefined || from === undefined) return NOT_SEEDED;

  try {
    const amount = parseAmount(ctx.config.AGENT_SEED_AMOUNT, decimalsOf(SEED_ASSET));
    if (amount <= 0n) return NOT_SEEDED;

    const submitted = await ctx.wallet.sendPayment({
      providerWalletId: walletId,
      from,
      to: wallet.address,
      amount,
      asset: SEED_ASSET,
      chain: wallet.chain as ChainId,
      idempotencyKey: `seed:${agentId}:${randomUUID()}`,
    });

    await appendAuditEvent(ctx.db, {
      orgId,
      actorType: 'system',
      action: 'wallet.seeded',
      subjectType: 'agent',
      subjectId: agentId,
      payload: { asset: SEED_ASSET, amount: money(amount, SEED_ASSET), txHash: submitted.txHash },
    });

    return { amount: money(amount, SEED_ASSET), txHash: submitted.txHash };
  } catch (cause) {
    log.warn({ err: cause, agentId }, 'Could not seed the new agent wallet.');
    return NOT_SEEDED;
  }
}

/**
 * Seeds a wallet that has ended up with nothing, once it is usable.
 *
 * @param ctx - Application context.
 * @param orgId - The organization the agent belongs to.
 * @param agentId - The agent whose wallet to top up.
 * @param wallet - The wallet, which must already have a Hedera account.
 * @param log - Where to record a treasury that could not pay.
 * @returns What was sent, or nothing.
 * @remarks A second chance, not a second payment. Seeding at registration is
 * the ordinary path; this covers the wallet that missed it — the treasury was
 * empty at the time, or the deployment had none configured until later — and
 * pays only when the balance really is zero.
 *
 * USDC only, deliberately. HBAR is not something Pocket hands out: an agent
 * never spends it, and the one place it is needed is a public faucet the
 * operator can reach themselves.
 *
 * An unreadable balance is not an empty one. Paying on a failed read would
 * double-fund a wallet every time the chain was briefly unavailable.
 */
export async function topUpIfEmpty(
  ctx: AppContext,
  orgId: string,
  agentId: string,
  wallet: { address: string; chain: string },
  log: SeedLogger,
): Promise<SeedResult> {
  let balance: bigint;
  try {
    balance = await ctx.chain.getBalance(wallet.address, SEED_ASSET);
  } catch (cause) {
    log.warn({ err: cause, agentId }, 'Could not read the balance before topping up.');
    return NOT_SEEDED;
  }
  if (balance > 0n) return NOT_SEEDED;
  return await seedAgentWallet(ctx, orgId, agentId, wallet, log);
}

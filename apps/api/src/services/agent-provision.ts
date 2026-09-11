/**
 * Giving a newly registered agent a wallet.
 *
 * Three things that have to happen together and in order: the provider mints
 * the wallet, Pocket records it against the agent, and the audit trail says
 * who asked. Kept out of the route so the handler reads as the sequence it is
 * rather than the mechanics of each step.
 */

import type { Wallet } from '@pocket/core';
import { appendAuditEvent, attachWallet } from '@pocket/db';
import type { AppContext } from '../context.js';

/**
 * Provisions and records the wallet for an agent that has just been created.
 *
 * @param ctx - Application context.
 * @param orgId - The organization the agent belongs to.
 * @param actorId - The signed-in person, or `null` for a machine principal.
 * @param agent - The agent to provision for.
 * @returns The recorded wallet.
 * @remarks The public key is captured here, at provisioning, rather than read
 * back from the chain later. A Hedera account created by an incoming transfer
 * publishes no key until it signs something, so an agent that has only ever
 * received money could not otherwise be signed for — and its first payment is
 * exactly the transaction that would have to publish it.
 */
export async function provisionAgentWallet(
  ctx: AppContext,
  orgId: string,
  actorId: string | null,
  agent: { id: string; name: string },
): Promise<Wallet> {
  const chain = ctx.config.CHAIN;
  const provisioned = await ctx.wallet.createWallet({ orgId, agentId: agent.id, chain });
  const wallet = await attachWallet(ctx.db, {
    orgId,
    agentId: agent.id,
    provider: ctx.wallet.name,
    providerWalletId: provisioned.providerWalletId,
    address: provisioned.address,
    publicKey: provisioned.publicKey,
    chain,
  });

  await appendAuditEvent(ctx.db, {
    orgId,
    actorType: 'human',
    actorId,
    action: 'agent.created',
    subjectType: 'agent',
    subjectId: agent.id,
    payload: { name: agent.name, walletAddress: wallet.address, provider: ctx.wallet.name },
  });

  return wallet;
}

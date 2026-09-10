/**
 * The two chain reads an agent's detail page needs.
 *
 * Both are best-effort. A page that cannot render because a mirror node is
 * slow is worse than one that renders with a value marked unknown, so neither
 * of these throws.
 */

import { resolveHederaAccount } from '@pocket/adapters';
import type { AssetId } from '@pocket/core';
import { money } from '../serialize.js';
import type { AppContext } from '../context.js';

/**
 * How long either read may take before the page gives up on it.
 *
 * @remarks Well under the mirror node's own fifteen-second ceiling. These
 * values decorate a page rather than decide anything, and a reader staring at
 * a blank screen because an index is slow is worse served than one shown a
 * value marked unknown.
 */
const READ_TIMEOUT_MS = 4_000;

/**
 * Resolves a value, or `null` if it takes too long.
 *
 * @param work - The read to bound.
 * @returns What the read produced, or `null` on timeout or failure.
 * @remarks The loser of the race is abandoned, not cancelled. Both callers are
 *   plain reads with no side effect, so letting one finish into nothing costs
 *   only the socket it was already using.
 */
async function bounded<T>(work: () => Promise<T>): Promise<T | null> {
  try {
    return await Promise.race([
      work(),
      new Promise<null>((resolve) => {
        setTimeout(() => {
          resolve(null);
        }, READ_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return null;
  }
}

/**
 * Reads a wallet's balance, tolerating a chain that will not answer.
 *
 * @param ctx - Application context.
 * @param wallet - The agent's wallet, or `null` when it has none.
 * @param asset - Asset to read, defaulting to USDC.
 * @returns The balance with its asset, or `null` when unknown.
 * @remarks An amount without a unit is not a balance, so the two travel
 *   together. `null` means the read failed and reads as "unknown"; a zero
 *   would be a lie.
 */
export async function readBalance(
  ctx: AppContext,
  wallet: { address: string } | null,
  asset: string | undefined,
): Promise<{ asset: string; amount: string } | null> {
  if (wallet === null) return null;
  const ticker = asset ?? 'USDC';
  return await bounded(async () => {
    const raw = await ctx.chain.getBalance(wallet.address, ticker as AssetId);
    return { asset: ticker, amount: money(raw, ticker) };
  });
}

/**
 * Reads a wallet's Hedera account id.
 *
 * @param ctx - Application context.
 * @param wallet - The agent's wallet, or `null` when it has none.
 * @returns The `0.0.x` id, or `null` when no account exists yet.
 * @remarks Hedera names an account two ways and a faucet may ask for either.
 *   The id only exists once something has been sent to the address, so `null`
 *   is a fact worth telling the reader rather than an error.
 */
export async function readAccountId(
  ctx: AppContext,
  wallet: { address: string; publicKey: string | null } | null,
): Promise<string | null> {
  if (wallet === null) return null;
  return await bounded(async () => {
    const resolved = await resolveHederaAccount(
      ctx.config.HEDERA_MIRROR_URL,
      wallet.address,
      wallet.publicKey ?? undefined,
    );
    return resolved.accountId;
  });
}

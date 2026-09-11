/**
 * The two chain reads an agent's detail page needs.
 *
 * Both are best-effort. A page that cannot render because a mirror node is
 * slow is worse than one that renders with a value marked unknown, so neither
 * of these throws.
 */

import { readHederaAccountState } from '@pocket/adapters';
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
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        work(),
        new Promise<null>((resolve) => {
          timer = setTimeout(() => {
            resolve(null);
          }, READ_TIMEOUT_MS);
        }),
      ]);
    } finally {
      // Cleared even when the read wins the race. Left running it holds a
      // handle for the full timeout, and the confirmation poll starts a dozen
      // of these per request.
      if (timer !== undefined) clearTimeout(timer);
    }
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
 * Reads a wallet's Hedera account, if it has one yet.
 *
 * @param ctx - Application context.
 * @param wallet - The agent's wallet, or `null` when it has none.
 * @returns The account's id and whether it has published a key, or `null`
 *   when no account exists yet or the read did not answer in time.
 * @remarks Hedera names an account two ways and a faucet may ask for either.
 *   The id only exists once something has been sent to the address, so `null`
 *   is a fact worth telling the reader rather than an error.
 *
 *   Whether the key is published travels with the id because the two are only
 *   useful together: an id belonging to a hollow account is one a faucet will
 *   refuse, and handing that to an operator with no warning is what makes the
 *   funding step fail in a way nothing on screen explains.
 */
export async function readAccount(
  ctx: AppContext,
  wallet: { address: string } | null,
): Promise<{ accountId: string; keyPublished: boolean } | null> {
  if (wallet === null) return null;
  // Normalised to `null`, because two layers here can each answer "nothing":
  // the read itself when no account exists, and the timeout around it. A
  // caller distinguishing them would learn nothing it could act on.
  return (
    (await bounded(async () =>
      readHederaAccountState(ctx.config.HEDERA_MIRROR_URL, wallet.address),
    )) ?? null
  );
}

/**
 * How long to wait for a mirror node to catch up with a signed transaction.
 *
 * @remarks Consensus is a couple of seconds; the mirror node indexes a moment
 * after that. Longer than a reader will sit still for is worse than admitting
 * the read is behind.
 */
const CONFIRM_TIMEOUT_MS = 12_000;

/** Gap between polls while waiting for the mirror node. */
const CONFIRM_INTERVAL_MS = 1_000;

/**
 * Waits for an account's key to appear on the mirror node.
 *
 * @param ctx - Application context.
 * @param wallet - The agent's wallet.
 * @returns `true` once the key is visible, `false` if it has not appeared in
 *   time.
 * @remarks A signature reaches consensus before an index reflects it, so the
 * transaction returning is not the same as the change being readable. Without
 * this the caller re-reads too early, sees the account still hollow, and
 * reports that nothing happened — when in fact it had.
 *
 * Returning `false` is not failure. The signature is on chain either way; the
 * only thing lost is the confirmation, and the next page load will have it.
 */
export async function awaitKeyPublished(
  ctx: AppContext,
  wallet: { address: string },
): Promise<boolean> {
  const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
  // Read first. Consensus is often reached before the response is written, so
  // sleeping up front costs every caller a second for nothing.
  while (Date.now() < deadline) {
    const state = await readAccount(ctx, wallet);
    if (state?.keyPublished === true) return true;
    // Checked again after the read, which can itself take seconds: testing
    // only at the top let one late iteration run well past the deadline the
    // documentation promises.
    if (Date.now() + CONFIRM_INTERVAL_MS >= deadline) break;
    await new Promise((resolve) => setTimeout(resolve, CONFIRM_INTERVAL_MS));
  }
  return false;
}

/**
 * Name of the cookie that puts the setup guide back to a first run.
 *
 * @remarks A cookie rather than component state or `localStorage`, for two
 * reasons. It has to survive a reload — a guide that forgets it was restarted
 * the moment the page is refreshed has not restarted anything. And the server
 * has to see it, so the page can render the first-run view directly instead of
 * sending the finished one and blanking it a frame later.
 *
 * Not `httpOnly`: the button that sets it runs in the browser, and it holds
 * nothing worth protecting.
 */
export const RESTART_COOKIE = 'pocket_setup_restart';

/**
 * Earliest instant a restart is allowed to claim, 2020-09-13.
 *
 * @remarks A floor, so a hand-edited or corrupted cookie reads as no restart
 * at all rather than as one dated 1970, which would hide every agent forever.
 */
const EARLIEST = 1_600_000_000_000;

/**
 * Reads the restart instant out of a raw cookie value.
 *
 * @param value - The cookie's value, or `undefined` when it is not set.
 * @param now - Current epoch milliseconds.
 * @returns Epoch milliseconds, or `null` when there is no usable restart.
 * @remarks An instant in the future is refused. It would hide every agent the
 * organization will ever register, which looks exactly like a guide that has
 * stopped working.
 */
export function readRestartAt(value: string | undefined, now: number): number | null {
  if (value === undefined || !/^\d{1,15}$/.test(value)) return null;
  const at = Number(value);
  return at >= EARLIEST && at <= now ? at : null;
}

/**
 * Whether a restart is still in effect.
 *
 * @param restartAt - The instant the guide was restarted, or `null`.
 * @param newestAgentCreatedAt - ISO registration time of the newest agent, or
 *   `null` when the organization has none.
 * @returns `true` while the guide should render as a first run.
 * @remarks It lapses on its own the moment an agent is registered after it.
 * That is the whole lifecycle: press restart and the guide is empty; name an
 * agent and it starts following that one. Nothing has to clear the cookie,
 * and nothing is deleted to make it true.
 */
export function restartInEffect(
  restartAt: number | null,
  newestAgentCreatedAt: string | null,
): boolean {
  if (restartAt === null) return false;
  if (newestAgentCreatedAt === null) return true;
  const created = Date.parse(newestAgentCreatedAt);
  return !Number.isFinite(created) || created < restartAt;
}

/**
 * Keyset pagination cursors.
 *
 * A cursor names the last row of a page by the columns the query is ordered
 * on: the timestamp, then the id to break ties. Listing by offset would skip
 * or repeat rows whenever something is written between two page loads, which
 * on an append-only ledger is most of the time.
 */

/**
 * The shape of a cursor: a timestamp as Postgres prints it, then an id.
 *
 * @remarks The timestamp travels as Postgres's own text form rather than as a
 * JavaScript date, because a `Date` keeps milliseconds while the column keeps
 * microseconds. Rounding it would let a row slip between two pages.
 */
const CURSOR =
  /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?[+-]\d{2}(?::\d{2})?)\|([A-Za-z0-9_-]+)$/;

/** The two halves of a cursor, once it has been recognised. */
export interface KeysetCursor {
  /** Postgres's text form of the timestamp, ready to cast back. */
  createdAt: string;
  id: string;
}

/**
 * Reads a cursor a previous page produced.
 *
 * @param raw - The cursor as the caller sent it, or `undefined`.
 * @returns Its two halves, or `null` when there is nothing usable.
 * @remarks Anything unrecognisable reads as `null`, which callers treat as the
 * first page. A stale or hand-edited link should show the list rather than an
 * error nobody can act on.
 */
export function readCursor(raw: string | undefined): KeysetCursor | null {
  if (raw === undefined) return null;
  const match = CURSOR.exec(raw);
  if (match === null) return null;
  const [, createdAt, id] = match;
  return createdAt === undefined || id === undefined ? null : { createdAt, id };
}

/**
 * Builds the cursor that follows a page.
 *
 * @param last - The last row of the page, already read back as text.
 * @param hasMore - Whether another row was fetched beyond the page.
 * @returns The cursor, or `null` when this is the last page.
 */
export function nextCursor(
  last: { createdAtText: string; id: string } | undefined,
  hasMore: boolean,
): string | null {
  return hasMore && last !== undefined ? `${last.createdAtText}|${last.id}` : null;
}

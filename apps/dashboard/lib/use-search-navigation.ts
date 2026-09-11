'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

/** The query key that says where in a list the reader is, rather than which. */
const POSITION_KEY = 'cursor';

/**
 * Filters and paging carried in the URL, for a list that the API pages.
 *
 * @param basePath The route the list lives at, for example `/audit`.
 * @returns Link builders and a filter setter.
 * @remarks Changing a filter drops the cursor and page number: a cursor from
 * one view means nothing in another, and the honest place to land is the
 * newest event of the new view. Paging keeps the filters, so a shared link
 * to page three of one agent's payments opens on page three of that agent.
 */
export function useSearchNavigation(basePath: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const href = (mutate: (params: URLSearchParams) => void): string => {
    const next = new URLSearchParams(searchParams.toString());
    mutate(next);
    const queryString = next.toString();
    return queryString === '' ? basePath : `${basePath}?${queryString}`;
  };

  /**
   * Sets one filter, or clears it when the value is the "any" sentinel.
   *
   * @param key The query key.
   * @param value The new value.
   * @param any The value that means "no filter".
   */
  const apply = (key: string, value: string, any: string): void => {
    const target = href((params) => {
      if (value === any) params.delete(key);
      else params.set(key, value);
      params.delete(POSITION_KEY);
    });
    startTransition(() => router.replace(target));
  };

  /**
   * Where "Newest" and "Older" lead from the current page.
   *
   * @param nextCursor Cursor for the page after this one, or `null` at the end.
   * @returns Both links, and whether this is the first page.
   * @remarks The cursor is the whole position. A page number alongside it
   * would be a second copy of the same fact, one that a hand-edited link can
   * contradict, and it buys only a label.
   */
  const pageLinks = (nextCursor: string | null) => ({
    /** Whether the reader is on the first page, which has no cursor. */
    onFirstPage: !searchParams.has(POSITION_KEY),
    newest: href((params) => {
      params.delete(POSITION_KEY);
    }),
    older: nextCursor === null ? null : href((params) => params.set(POSITION_KEY, nextCursor)),
  });

  return { apply, pageLinks, pending };
}

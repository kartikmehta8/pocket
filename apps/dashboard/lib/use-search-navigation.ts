'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

/** Query keys that belong to a position in a list, not to a view of it. */
const POSITION_KEYS = ['cursor', 'page'] as const;

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
      for (const position of POSITION_KEYS) params.delete(position);
    });
    startTransition(() => router.replace(target));
  };

  /**
   * Where "Newest" and "Older" lead from the current page.
   *
   * @param nextCursor Cursor for the page after this one, or `null` at the end.
   * @param page The current page, counting from one.
   */
  const pageLinks = (nextCursor: string | null, page: number) => ({
    newest: href((params) => {
      for (const position of POSITION_KEYS) params.delete(position);
    }),
    older:
      nextCursor === null
        ? null
        : href((params) => {
            params.set('cursor', nextCursor);
            params.set('page', String(page + 1));
          }),
  });

  return { apply, pageLinks, pending };
}

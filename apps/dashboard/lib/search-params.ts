/** The shape Next hands a page for its query string. */
export type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Reads one search parameter as a string.
 *
 * @param value The raw value, which Next gives as an array when the key
 *   appears more than once.
 * @returns The first occurrence, or `''` when the key is absent.
 * @remarks Repeats are ignored rather than joined or refused. `?status=a&status=b`
 * is something only a hand-edited URL produces, and answering it with the
 * first value shows a list rather than an error page.
 */
export function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

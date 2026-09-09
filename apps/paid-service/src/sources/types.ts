/**
 * What a purchasable data feed has to provide.
 *
 * Every resource this seller offers is backed by a real upstream API, not a
 * canned payload. That is the point: an agent buying `/v1/market/prices` gets
 * the same number a developer would get from a commercial data provider, and
 * pays for it the same way — per call, in stablecoin, with a receipt.
 */

/** One purchasable feed. */
export interface DataSource<T = unknown> {
  /** Stable identifier, used as the cache key. */
  id: string;
  /** Path the resource is served at, below the seller's base URL. */
  path: string;
  /** Short name, shown in the catalog. */
  title: string;
  /** One line saying what a buyer gets and why they would want it. */
  description: string;
  /** What a developer would realistically use this for. */
  useCase: string;
  /** Where the data actually comes from. Named, because a buyer should know. */
  provider: string;
  /** Price as a decimal string in the settlement asset. */
  price: string;
  /** How long a snapshot stays fresh, in milliseconds. */
  ttlMs: number;
  /**
   * Fetches a fresh snapshot.
   *
   * @returns The payload to serve.
   * @throws {Error} When the upstream is unreachable or answers unusably. The
   *   cache catches this and keeps serving the previous snapshot.
   */
  load(): Promise<T>;
}

/** Milliseconds to wait on any upstream before giving up. */
export const UPSTREAM_TIMEOUT_MS = 8_000;

/**
 * Fetches JSON from an upstream, with a timeout and an honest failure.
 *
 * @param url - Absolute URL.
 * @param init - Optional request init, merged with the abort signal.
 * @returns The parsed body.
 * @throws {Error} Naming the upstream and the status, so a failed refresh is
 *   diagnosable from one log line.
 */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('accept', 'application/json');
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers,
  });
  if (!response.ok) {
    throw new Error(`${new URL(url).host} answered ${response.status}.`);
  }
  return (await response.json()) as T;
}

/**
 * Calls a JSON-RPC method on an EVM node.
 *
 * @param url - RPC endpoint.
 * @param method - Method name.
 * @param params - Positional parameters.
 * @returns The `result` field.
 * @throws {Error} When the node returns a JSON-RPC error.
 */
export async function rpc<T>(url: string, method: string, params: unknown[] = []): Promise<T> {
  const body = await fetchJson<{ result?: T; error?: { message: string } }>(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (body.error !== undefined) throw new Error(`${method}: ${body.error.message}`);
  if (body.result === undefined) throw new Error(`${method} returned no result.`);
  return body.result;
}

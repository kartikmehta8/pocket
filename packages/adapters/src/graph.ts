/**
 * The Graph analytics adapter.
 *
 * Queries a subgraph for the transfers involving an agent wallet, which lets
 * Purse answer "what actually settled on chain" independently of its own
 * ledger. Reconciling the two is what turns a discrepancy into a visible
 * anomaly instead of an invisible one.
 */

import {
  PurseError,
  isAssetId,
  type AnalyticsProvider,
  type IndexedTransfer,
  type TransferQuery,
} from '@purse/core';

/** Options for {@link GraphAnalyticsProvider}. */
export interface GraphOptions {
  /** Full subgraph query URL. */
  subgraphUrl: string;
  /** Gateway API key, sent as a bearer token when present. */
  apiKey?: string | undefined;
  /** Overrides the built-in query for a subgraph with a different schema. */
  query?: string | undefined;
  /** Request deadline in milliseconds. */
  timeoutMs?: number | undefined;
}

/**
 * Default query. Assumes a conventional ERC-20 subgraph exposing a `transfers`
 * entity. Override it with {@link GraphOptions.query} for a different schema.
 *
 * @remarks The window bounds are repeated inside each `or` branch on purpose.
 * graph-node rejects a `where` that mixes top-level fields with `or`, failing
 * with "Filter must by an object", so the conditions have to be distributed.
 */
const DEFAULT_QUERY = `
  query PurseTransfers($address: Bytes!, $since: BigInt!, $until: BigInt!, $limit: Int!) {
    transfers(
      first: $limit
      orderBy: timestamp
      orderDirection: desc
      where: {
        or: [
          { from: $address, timestamp_gte: $since, timestamp_lt: $until }
          { to: $address, timestamp_gte: $since, timestamp_lt: $until }
        ]
      }
    ) {
      transaction
      from
      to
      value
      timestamp
      token { symbol }
    }
  }
`;

interface RawTransfer {
  transaction?: unknown;
  from?: unknown;
  to?: unknown;
  value?: unknown;
  timestamp?: unknown;
  token?: { symbol?: unknown } | null;
}

/** Analytics provider backed by a subgraph on The Graph. */
export class GraphAnalyticsProvider implements AnalyticsProvider {
  public readonly name = 'the-graph';
  readonly #options: Required<Pick<GraphOptions, 'subgraphUrl' | 'query' | 'timeoutMs'>> & {
    apiKey: string | undefined;
  };

  /**
   * @param options - Subgraph endpoint and optional gateway key.
   */
  public constructor(options: GraphOptions) {
    this.#options = {
      subgraphUrl: options.subgraphUrl,
      apiKey: options.apiKey,
      query: options.query ?? DEFAULT_QUERY,
      timeoutMs: options.timeoutMs ?? 10_000,
    };
  }

  /** This provider reads a live index. */
  public isLive(): boolean {
    return true;
  }

  /**
   * Fetches transfers involving an address in a time window.
   *
   * @param query - Address and window. `limit` defaults to 100.
   * @returns Transfers newest first, with amounts in base units.
   * @throws {PurseError} `UPSTREAM_UNAVAILABLE` when the gateway errors, times
   *   out, or returns GraphQL errors.
   */
  public async getTransfers(query: TransferQuery): Promise<IndexedTransfer[]> {
    const body = JSON.stringify({
      query: this.#options.query,
      variables: {
        address: query.address.toLowerCase(),
        since: Math.floor(query.since.getTime() / 1000).toString(),
        until: Math.floor(query.until.getTime() / 1000).toString(),
        limit: query.limit ?? 100,
      },
    });

    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.#options.apiKey !== undefined) {
      headers['authorization'] = `Bearer ${this.#options.apiKey}`;
    }

    let payload: unknown;
    try {
      const response = await fetch(this.#options.subgraphUrl, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(this.#options.timeoutMs),
      });
      if (!response.ok) {
        throw new PurseError('UPSTREAM_UNAVAILABLE', `The Graph returned ${response.status}.`);
      }
      payload = await response.json();
    } catch (cause) {
      if (PurseError.is(cause)) throw cause;
      throw new PurseError('UPSTREAM_UNAVAILABLE', 'Could not reach The Graph.', undefined, cause);
    }

    return this.#parse(payload);
  }

  /**
   * Validates and narrows a GraphQL response.
   *
   * @param payload - Untrusted response body.
   * @returns Well-formed transfers. Malformed rows are dropped rather than
   *   coerced, because a guessed amount is worse than a missing one.
   * @throws {PurseError} `UPSTREAM_UNAVAILABLE` when the response carries
   *   GraphQL errors or has no `transfers` array.
   */
  #parse(payload: unknown): IndexedTransfer[] {
    if (typeof payload !== 'object' || payload === null) {
      throw new PurseError('UPSTREAM_UNAVAILABLE', 'The Graph returned a non-object response.');
    }
    const record = payload as { data?: { transfers?: unknown }; errors?: unknown };
    if (Array.isArray(record.errors) && record.errors.length > 0) {
      throw new PurseError('UPSTREAM_UNAVAILABLE', 'The Graph returned query errors.', {
        count: String(record.errors.length),
      });
    }
    const rows = record.data?.transfers;
    if (!Array.isArray(rows)) {
      throw new PurseError('UPSTREAM_UNAVAILABLE', 'The Graph response had no transfers array.');
    }

    const transfers: IndexedTransfer[] = [];
    for (const row of rows as RawTransfer[]) {
      const symbol = typeof row.token?.symbol === 'string' ? row.token.symbol : 'USDC';
      if (
        typeof row.transaction !== 'string' ||
        typeof row.from !== 'string' ||
        typeof row.to !== 'string' ||
        !isAssetId(symbol)
      ) {
        continue;
      }
      try {
        transfers.push({
          txHash: row.transaction,
          from: row.from.toLowerCase(),
          to: row.to.toLowerCase(),
          amount: BigInt(String(row.value)),
          asset: symbol,
          blockTimestamp: new Date(Number(row.timestamp) * 1000),
        });
      } catch {
        continue;
      }
    }
    return transfers;
  }
}

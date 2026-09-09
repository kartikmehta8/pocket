/**
 * Live asset pricing composed from two of The Graph's products.
 *
 * A spending limit written in tokens is not a limit on money. This provider
 * prices the settlement asset so a policy can bound the value of a payment,
 * and it does so from two independent Graph sources rather than one:
 *
 * - the **Token API**, a hosted REST product, and
 * - a **Subgraph** served through the decentralized gateway.
 *
 * Composing them is the point. A single price feed is a single point of
 * failure for a control that decides whether money moves, so the two must
 * agree within a configured tolerance. When they disagree the provider
 * returns no price at all, and the policy engine denies rather than guesses.
 */

import {
  PurseError,
  type AssetId,
  type MarketDataProvider,
  type PriceQuote,
  type PriceResult,
} from '@purse/core';

/** Configuration for {@link GraphMarketDataProvider}. */
export interface GraphMarketOptions {
  /** Token API base URL. */
  tokenApiUrl: string;
  /** Token API bearer token, issued by The Graph Market. */
  tokenApiJwt: string;
  /** Subgraph query URL on the decentralized gateway. */
  subgraphUrl: string;
  /** Gateway API key, issued by Subgraph Studio. */
  subgraphApiKey: string;
  /** EVM network the price sources cover, for example `mainnet`. */
  network: string;
  /** Contract address of the asset on that network, per asset ticker. */
  contracts: Readonly<Partial<Record<AssetId, string>>>;
  /** How far the two sources may diverge, in basis points. */
  toleranceBps: number;
  timeoutMs?: number;
}

/** GraphQL query for a token's USD price on a conventional DEX subgraph. */
const PRICE_QUERY = `
  query PurseTokenPrice($id: ID!) {
    token(id: $id) {
      symbol
      derivedUSD
    }
  }
`;

/** Pricing composed from the Token API and a gateway-served subgraph. */
export class GraphMarketDataProvider implements MarketDataProvider {
  public readonly name = 'the-graph';
  readonly #options: Required<Omit<GraphMarketOptions, 'contracts'>> & {
    contracts: GraphMarketOptions['contracts'];
  };

  /**
   * @param options - Endpoints, credentials and the agreement tolerance.
   */
  public constructor(options: GraphMarketOptions) {
    this.#options = { timeoutMs: 10_000, ...options };
  }

  /** This provider reads live data from both Graph products. */
  public isLive(): boolean {
    return true;
  }

  /**
   * Prices one whole unit of an asset by consulting both products.
   *
   * @param asset - Asset ticker to price.
   * @returns The composed result. `usdCentsPerUnit` is `null` when either
   *   source failed or the two disagreed beyond the tolerance.
   * @throws {PurseError} `VALIDATION_FAILED` when the asset has no configured
   *   contract address, because guessing one would price the wrong token.
   */
  public async priceUsdCents(asset: AssetId): Promise<PriceResult> {
    const contract = this.#options.contracts[asset];
    if (contract === undefined) {
      throw new PurseError('VALIDATION_FAILED', `No price contract configured for ${asset}.`, {
        asset,
      });
    }

    const [tokenApi, subgraph] = await Promise.all([
      this.#fromTokenApi(contract).catch(() => null),
      this.#fromSubgraph(contract).catch(() => null),
    ]);

    const quotes = [tokenApi, subgraph].filter((quote): quote is PriceQuote => quote !== null);
    if (quotes.length < 2) {
      return {
        usdCentsPerUnit: null,
        quotes,
        disagreementReason: 'Fewer than two price sources responded, so no price was agreed.',
      };
    }

    const [a, b] = quotes as [PriceQuote, PriceQuote];
    const spread = Math.abs(a.usdCentsPerUnit - b.usdCentsPerUnit);
    const midpoint = (a.usdCentsPerUnit + b.usdCentsPerUnit) / 2;
    const spreadBps = midpoint === 0 ? Number.POSITIVE_INFINITY : (spread / midpoint) * 10_000;

    if (spreadBps > this.#options.toleranceBps) {
      return {
        usdCentsPerUnit: null,
        quotes,
        disagreementReason: `Price sources disagreed by ${Math.round(spreadBps)} bps, over the ${this.#options.toleranceBps} bps tolerance.`,
      };
    }

    // The lower of two agreeing quotes, so a ceiling never lets more value
    // through than the most conservative source would have allowed.
    return { usdCentsPerUnit: Math.min(a.usdCentsPerUnit, b.usdCentsPerUnit), quotes };
  }

  /**
   * Reads a price from The Graph's Token API.
   *
   * @param contract - Token contract address on the configured network.
   * @returns A quote, or `null` when the response carried no usable price.
   */
  async #fromTokenApi(contract: string): Promise<PriceQuote | null> {
    const url = new URL('/v1/evm/tokens', this.#options.tokenApiUrl);
    url.searchParams.set('network', this.#options.network);
    url.searchParams.set('contract', contract);

    const response = await fetch(url, {
      headers: { authorization: `Bearer ${this.#options.tokenApiJwt}` },
      signal: AbortSignal.timeout(this.#options.timeoutMs),
    });
    if (!response.ok) return null;

    const body = (await response.json()) as { data?: Array<Record<string, unknown>> };
    const price = body.data?.[0]?.['price_usd'];
    const usd = typeof price === 'number' ? price : Number(price);
    if (!Number.isFinite(usd) || usd <= 0) return null;
    return { usdCentsPerUnit: Math.round(usd * 100), source: 'token-api' };
  }

  /**
   * Reads a price from a subgraph served by the decentralized gateway.
   *
   * @param contract - Token contract address on the configured network.
   * @returns A quote, or `null` when the response carried no usable price.
   */
  async #fromSubgraph(contract: string): Promise<PriceQuote | null> {
    const response = await fetch(this.#options.subgraphUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.#options.subgraphApiKey}`,
      },
      body: JSON.stringify({ query: PRICE_QUERY, variables: { id: contract.toLowerCase() } }),
      signal: AbortSignal.timeout(this.#options.timeoutMs),
    });
    if (!response.ok) return null;

    const body = (await response.json()) as {
      data?: { token?: { derivedUSD?: unknown } | null };
      errors?: unknown[];
    };
    if (Array.isArray(body.errors) && body.errors.length > 0) return null;
    const usd = Number(body.data?.token?.derivedUSD);
    if (!Number.isFinite(usd) || usd <= 0) return null;
    return { usdCentsPerUnit: Math.round(usd * 100), source: 'gateway-subgraph' };
  }
}

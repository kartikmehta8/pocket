/**
 * Market data stand-ins.
 *
 * Neither of these invents a price. A control that bounds the value of a
 * payment is worthless if it can be satisfied by a made-up number, so the
 * offline behaviour is to refuse to price and let the policy engine deny.
 */

import type { AssetId, MarketDataProvider, PriceResult } from '@pocket/core';

/**
 * Pricing that reads no market.
 *
 * @remarks Selected when the Graph credentials are absent. It reports
 * `isLive()` as false and returns no price, so a policy with a USD ceiling
 * denies rather than silently losing the control. A fake price here would be
 * the most dangerous kind of convenience.
 */
export class UnpricedMarketDataProvider implements MarketDataProvider {
  public readonly name = 'unpriced';

  /** This provider reads no live market. */
  public isLive(): boolean {
    return false;
  }

  /**
   * Returns no price.
   *
   * @param _asset - Ignored.
   * @returns A result with no agreed price and the reason why.
   */
  public priceUsdCents(_asset: AssetId): Promise<PriceResult> {
    return Promise.resolve({
      usdCentsPerUnit: null,
      quotes: [],
      disagreementReason: 'No market data provider is configured.',
    });
  }
}

/**
 * Pricing with a value the caller sets.
 *
 * @remarks For tests only. It models the two behaviours that matter: an agreed
 * price, and a refusal to price, which is the case a USD ceiling must fail
 * closed on.
 */
export class StubMarketDataProvider implements MarketDataProvider {
  public readonly name = 'stub';
  #usdCentsPerUnit: number | null = null;

  /** Sets the price returned for every asset, or `null` to refuse to price. */
  public setPrice(usdCentsPerUnit: number | null): void {
    this.#usdCentsPerUnit = usdCentsPerUnit;
  }

  /** This provider reads no live market. */
  public isLive(): boolean {
    return false;
  }

  /**
   * Returns the configured price.
   *
   * @param _asset - Ignored.
   * @returns The configured price, framed as two agreeing quotes.
   */
  public priceUsdCents(_asset: AssetId): Promise<PriceResult> {
    if (this.#usdCentsPerUnit === null) {
      return Promise.resolve({
        usdCentsPerUnit: null,
        quotes: [],
        disagreementReason: 'Stub configured to refuse pricing.',
      });
    }
    const quotes = ['token-api', 'gateway-subgraph'].map((source) => ({
      source,
      usdCentsPerUnit: this.#usdCentsPerUnit as number,
    }));
    return Promise.resolve({ usdCentsPerUnit: this.#usdCentsPerUnit, quotes });
  }
}

/**
 * Pricing a payment, but only when a policy actually needs it.
 *
 * The market is consulted lazily. An organization that sets no USD ceiling
 * never pays the latency of a price lookup, and a provider outage cannot
 * affect payments that were never going to be priced.
 */

import { decimalsOf, type AssetId, type MarketDataProvider } from '@pocket/core';
import type { EvaluablePolicy } from '@pocket/core';

/** A price lookup and the evidence behind it. */
export interface PricingOutcome {
  /** The payment's value in USD cents, or `null` when it could not be priced. */
  usdCents: bigint | null;
  /** Quotes consulted, recorded in the audit trail when a ceiling applied. */
  quotes: Array<{ source: string; usdCentsPerUnit: number }>;
  /** Why no price was agreed, when applicable. */
  reason?: string;
}

/** Nothing was needed, so nothing was looked up. */
const NOT_REQUIRED: PricingOutcome = { usdCents: null, quotes: [] };

/**
 * Prices a payment when the policy sets a USD ceiling.
 *
 * @param market - Market data provider.
 * @param policy - The agent's policy, or `null` when none is configured.
 * @param amount - Payment amount in the asset's base units.
 * @param asset - Asset being paid.
 * @returns The value in USD cents, or `null` when unpriced or unpriceable.
 * @remarks A failure returns `null` rather than throwing. The policy engine
 *   treats `null` as a denial when a ceiling applies, so a broken price feed
 *   blocks spending instead of quietly disabling the control.
 */
export async function priceIfRequired(
  market: MarketDataProvider,
  policy: EvaluablePolicy | null,
  amount: bigint,
  asset: AssetId,
): Promise<PricingOutcome> {
  if (policy === null || policy.maxUsdCentsPerTransaction === undefined) return NOT_REQUIRED;

  try {
    const result = await market.priceUsdCents(asset);
    const quotes = result.quotes.map((quote) => ({
      source: quote.source,
      usdCentsPerUnit: quote.usdCentsPerUnit,
    }));
    if (result.usdCentsPerUnit === null) {
      return {
        usdCents: null,
        quotes,
        ...(result.disagreementReason === undefined ? {} : { reason: result.disagreementReason }),
      };
    }
    // Cents per whole unit, scaled by the payment's base units. Integer maths
    // throughout: a price is money and never goes through a float.
    const scale = 10n ** BigInt(decimalsOf(asset));
    const usdCents = (amount * BigInt(result.usdCentsPerUnit)) / scale;
    return { usdCents, quotes };
  } catch (cause) {
    return { usdCents: null, quotes: [], reason: `Pricing failed: ${String(cause)}` };
  }
}

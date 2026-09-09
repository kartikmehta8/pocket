/**
 * Shared shapes for the facilitator-settled x402 flow.
 */

/** The x402 payment requirement a seller advertised. */
export interface X402Requirements {
  scheme: string;
  network: string;
  /** Price in the asset's base units. */
  amount: string;
  /** Hedera token id, or `HBAR` for the native asset. */
  asset: string;
  /** Hedera account id of the payee. */
  payTo: string;
  maxTimeoutSeconds: number;
  /** Carries the facilitator's fee payer. */
  extra?: Record<string, unknown> | null;
}

/** A signed x402 payload, ready to present as `X-PAYMENT`. */
export interface X402PaymentPayload {
  x402Version: number;
  accepted: X402Requirements;
  payload: { transaction: string };
}

/**
 * Converts base units to a decimal string at a given precision.
 *
 * @param baseUnits - Amount as the seller advertised it.
 * @param decimals - Precision of the asset.
 * @returns A decimal string the payment schemas accept.
 */
export function toDecimal(baseUnits: string, decimals: number): string {
  const digits = baseUnits.padStart(decimals + 1, '0');
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = decimals === 0 ? '' : digits.slice(digits.length - decimals).replace(/0+$/, '');
  return fraction === '' ? whole : `${whole}.${fraction}`;
}

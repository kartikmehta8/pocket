/**
 * Decimal-safe money handling.
 *
 * Financial values are never represented as JavaScript numbers. Every amount is
 * a `bigint` count of an asset's smallest indivisible unit ("base units"), and
 * conversion to and from human decimal strings happens only at trust
 * boundaries.
 */

import { PocketError } from './errors.js';

/** A signed amount in an asset's smallest indivisible unit. */
export type BaseUnits = bigint;

/** Matches an unsigned decimal literal such as `0`, `12`, or `0.084`. */
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

/**
 * Parses a human decimal string into base units.
 *
 * @param value - Unsigned decimal string, for example `"0.08"`. Scientific
 *   notation, signs, whitespace and empty strings are rejected.
 * @param decimals - Number of decimal places the asset supports.
 * @returns The amount in base units.
 * @throws {PocketError} `VALIDATION_FAILED` when the literal is malformed or
 *   carries more precision than the asset can represent.
 */
export function parseAmount(value: string, decimals: number): BaseUnits {
  if (!DECIMAL_PATTERN.test(value)) {
    throw new PocketError('VALIDATION_FAILED', 'Amount must be an unsigned decimal string.', {
      value,
    });
  }
  const [whole = '0', fraction = ''] = value.split('.');
  if (fraction.length > decimals) {
    throw new PocketError(
      'VALIDATION_FAILED',
      `Amount carries more than ${decimals} decimal places.`,
      { value, decimals },
    );
  }
  return BigInt(whole + fraction.padEnd(decimals, '0'));
}

/**
 * Formats base units as a human decimal string.
 *
 * @param amount - Amount in base units. May be negative.
 * @param decimals - Number of decimal places the asset supports.
 * @returns A decimal string with trailing zeros trimmed, for example `"0.08"`.
 */
export function formatAmount(amount: BaseUnits, decimals: number): string {
  const negative = amount < 0n;
  const digits = (negative ? -amount : amount).toString().padStart(decimals + 1, '0');
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = decimals === 0 ? '' : digits.slice(digits.length - decimals).replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

/**
 * Clamps a subtraction at zero, used for "remaining budget" arithmetic where a
 * negative remainder is meaningless.
 *
 * @param limit - Upper bound in base units.
 * @param used - Amount already consumed in base units.
 * @returns `limit - used`, or `0n` when `used` meets or exceeds `limit`.
 */
export function remaining(limit: BaseUnits, used: BaseUnits): BaseUnits {
  const left = limit - used;
  return left > 0n ? left : 0n;
}

/** Sums base-unit amounts without intermediate float conversion. */
export function sum(amounts: readonly BaseUnits[]): BaseUnits {
  return amounts.reduce<BaseUnits>((total, amount) => total + amount, 0n);
}

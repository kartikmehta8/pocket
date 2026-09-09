/**
 * Display formatting for the Purse dashboard.
 *
 * Money arrives as a decimal string and is formatted as a string: the integer
 * part is grouped and the fraction is padded or trimmed textually, so no value
 * ever passes through a binary float on its way to the screen.
 */

/** Split a signed decimal string into sign, integer and fraction parts. */
function parts(value: string): { sign: string; int: string; frac: string } {
  const trimmed = value.trim();
  const sign = trimmed.startsWith('-') ? '-' : '';
  const unsigned = sign ? trimmed.slice(1) : trimmed;
  const dot = unsigned.indexOf('.');
  const int = dot === -1 ? unsigned : unsigned.slice(0, dot);
  const frac = dot === -1 ? '' : unsigned.slice(dot + 1);
  return { sign, int: int === '' ? '0' : int, frac };
}

/** Insert thousands separators into a digit-only integer string. */
function group(int: string): string {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Shown in place of a value that is absent.
 *
 * @remarks A word rather than a dash. A reader scanning a column needs to tell
 * "we do not have this" apart from a minus sign or a rendering glitch, and a
 * glyph does not carry that on its own.
 */
export const EMPTY = 'n/a';

/**
 * Format a decimal money string for display without float arithmetic.
 *
 * @param value Decimal string such as `"8.42"`. Non-numeric input passes through.
 * @param decimals Fixed number of fraction digits to render.
 * @returns A grouped, fixed-precision string such as `"1,284.42"`.
 */
export function formatMoney(value: string | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || value === '') return EMPTY;
  if (!/^-?\d*\.?\d*$/.test(value.trim())) return value;
  const { sign, int, frac } = parts(value);
  const padded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  return decimals === 0 ? `${sign}${group(int)}` : `${sign}${group(int)}.${padded}`;
}

/**
 * Format money beside its asset ticker.
 *
 * @param value Decimal string.
 * @param asset Asset ticker such as `"USDC"`.
 * @param decimals Fraction digits to render.
 */
export function formatAmount(
  value: string | null | undefined,
  asset: string | null | undefined,
  decimals = 2,
): string {
  const amount = formatMoney(value, decimals);
  if (amount === EMPTY || !asset) return amount;
  return `${amount} ${asset}`;
}

/**
 * Convert a decimal string to a number for geometry only — chart heights and
 * meter widths. Never use the result as a monetary value.
 *
 * @param value Decimal string.
 * @returns A finite number, or `0` when the input cannot be read.
 */
export function toPlotNumber(value: string | null | undefined): number {
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Fraction of a limit that has been consumed, clamped to `0..1`.
 *
 * @param used Amount spent, as a decimal string.
 * @param limit Ceiling, as a decimal string.
 * @returns `0` when the limit is zero or unreadable.
 */
export function usageRatio(
  used: string | null | undefined,
  limit: string | null | undefined,
): number {
  const cap = toPlotNumber(limit);
  if (cap <= 0) return 0;
  return Math.min(1, Math.max(0, toPlotNumber(used) / cap));
}

/**
 * Shorten a wallet address for dense display.
 *
 * @param address Full address; short addresses are returned unchanged.
 * @param lead Characters to keep at the start.
 * @param tail Characters to keep at the end.
 */
export function truncateAddress(address: string, lead = 6, tail = 4): string {
  return address.length <= lead + tail + 1
    ? address
    : `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

/** Render an ISO-8601 timestamp as a short absolute date, e.g. `12 Mar`. */
export function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Render an ISO-8601 timestamp as date plus 24-hour time, e.g. `12 Mar 14:03`. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Render an ISO-8601 timestamp with seconds, for the audit trail. */
export function formatPrecise(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
}

/** Turn a snake- or kebab-cased token into sentence case, e.g. `Awaiting approval`. */
export function humanize(token: string): string {
  const spaced = token.replace(/[_-]+/g, ' ').toLowerCase().trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Render a signed percentage change, e.g. `+264.5%`. */
export function formatPercentDelta(percent: number): string {
  if (!Number.isFinite(percent)) return EMPTY;
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(1)}%`;
}

/**
 * Add decimal money strings exactly, using scaled integer arithmetic.
 *
 * Values are truncated (never rounded) to `decimals` places before summing, so
 * the result can only ever understate a total by less than one minor unit.
 *
 * @param values Decimal strings; blanks and unreadable entries count as zero.
 * @param decimals Fraction digits of the result.
 * @returns A plain decimal string, e.g. `"12.40"`.
 */
export function sumMoney(values: ReadonlyArray<string | null | undefined>, decimals = 2): string {
  const scale = 10n ** BigInt(decimals);
  let total = 0n;
  for (const value of values) {
    if (!value || !/^-?\d*\.?\d*$/.test(value.trim())) continue;
    const { sign, int, frac } = parts(value);
    const scaled = BigInt(int) * scale + BigInt((frac + '0'.repeat(decimals)).slice(0, decimals));
    total += sign === '-' ? -scaled : scaled;
  }
  const negative = total < 0n;
  const magnitude = (negative ? -total : total).toString().padStart(decimals + 1, '0');
  const cut = magnitude.length - decimals;
  const int = magnitude.slice(0, cut);
  const frac = magnitude.slice(cut);
  return `${negative ? '-' : ''}${int}${decimals > 0 ? `.${frac}` : ''}`;
}

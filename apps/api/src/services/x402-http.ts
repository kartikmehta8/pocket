/**
 * The HTTP half of the x402 conversation.
 *
 * Encoding and decoding only — no policy, no signing, no database. Kept apart
 * from the orchestration so the wire format lives in one readable place, and
 * so a change to how a seller frames its challenge cannot accidentally reach
 * into the money path.
 */

import type { X402PaymentPayload, X402Requirements } from './x402-types.js';

/** The decoded `payment-required` challenge a seller returns with a 402. */
export interface X402Challenge {
  x402Version: number;
  accepts: X402Requirements[];
  resource?: { url?: string; description?: string; mimeType?: string };
}

/** How long to wait for the seller, in milliseconds. */
export const FETCH_TIMEOUT_MS = 20_000;

/** How long to wait for the paid response, which includes settlement. */
export const SETTLE_TIMEOUT_MS = 60_000;

/**
 * Decodes a base64 JSON header into a plain object.
 *
 * @param header - Raw header value, or `null` when absent.
 * @returns The parsed object, or `null` when absent, malformed, or not an
 *   object.
 * @remarks Malformed is treated as absent rather than thrown. A seller that
 *   sends a header Purse cannot read is a seller Purse will not transact with,
 *   and the caller gets a clear message instead of a parse stack.
 */
export function decodeHeader(header: string | null): Record<string, unknown> | null {
  if (header === null || header.trim() === '') return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(header, 'base64').toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Decodes a `payment-required` challenge, checking it carries usable terms.
 *
 * @param header - Raw header value.
 * @returns The challenge, or `null` when it is absent, malformed, or advertises
 *   no terms. The shape is checked here rather than asserted, because
 *   everything downstream treats these numbers as a price.
 */
export function decodeChallenge(header: string | null): X402Challenge | null {
  const body = decodeHeader(header);
  if (body === null) return null;
  const accepts = body['accepts'];
  if (!Array.isArray(accepts) || accepts.length === 0) return null;
  return body as unknown as X402Challenge;
}

/**
 * Encodes a signed payload for the `payment-signature` header.
 *
 * @param payload - The signed x402 payload.
 * @returns Base64 JSON.
 * @remarks x402 v2 carries the payload in `payment-signature`. The older
 *   `X-PAYMENT` name is v1 and modern sellers do not read it.
 */
export function encodePayment(payload: X402PaymentPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/** A seller's first answer: the resource, or a demand for payment. */
export type FirstResponse =
  | { kind: 'free'; body: unknown }
  | { kind: 'challenge'; challenge: X402Challenge }
  | { kind: 'error'; status: number; detail: string };

/**
 * Asks a seller for a resource without paying.
 *
 * @param url - The resource.
 * @returns What the seller said: served it, demanded payment, or refused.
 * @throws {Error} Only when the request could not be made at all.
 */
export async function requestResource(url: URL): Promise<FirstResponse> {
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (response.status === 402) {
    const challenge = decodeChallenge(response.headers.get('payment-required'));
    if (challenge === null) {
      return {
        kind: 'error',
        status: 402,
        detail: 'The seller demanded payment but advertised no acceptable terms.',
      };
    }
    return { kind: 'challenge', challenge };
  }

  if (!response.ok) {
    return {
      kind: 'error',
      status: response.status,
      detail: (await response.text()).slice(0, 300),
    };
  }
  return { kind: 'free', body: await response.json() };
}

/** The seller's answer once presented with a signed payment. */
export type PaidResponse =
  | { kind: 'served'; body: unknown; settlement: Record<string, unknown> | null }
  | { kind: 'rejected'; status: number; detail: string };

/**
 * Presents a signed payment and collects the resource.
 *
 * @param url - The resource.
 * @param payload - The signed x402 payload.
 * @returns The resource and the settlement receipt, or the seller's refusal.
 */
export async function payForResource(url: URL, payload: X402PaymentPayload): Promise<PaidResponse> {
  const response = await fetch(url, {
    headers: { accept: 'application/json', 'payment-signature': encodePayment(payload) },
    signal: AbortSignal.timeout(SETTLE_TIMEOUT_MS),
  });

  if (!response.ok) {
    return {
      kind: 'rejected',
      status: response.status,
      detail: (await response.text()).slice(0, 300),
    };
  }

  return {
    kind: 'served',
    body: await response.json(),
    settlement: decodeHeader(response.headers.get('payment-response')),
  };
}

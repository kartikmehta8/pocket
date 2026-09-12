/**
 * Validation for buyer-supplied resource URLs.
 *
 * The purchase flow fetches a URL the caller chose. That makes the API an
 * outbound HTTP client on behalf of an untrusted request, which is the classic
 * shape of a server-side request forgery: without a check, an agent could name
 * an internal address and have the API fetch it from inside the network.
 *
 * So private and loopback destinations are refused by default, and permitted
 * only when an operator has explicitly said this deployment is local.
 */

import { PocketError } from '@pocket/core';

/** Hostnames that always resolve to the machine itself. */
const LOOPBACK_NAMES = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', '[::1]']);

/** Address blocks that never appear on the public internet. */
const PRIVATE_V4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

/**
 * Whether a hostname is unambiguously private.
 *
 * @param hostname - Host from the parsed URL, already lowercased by `URL`.
 * @returns True for loopback names, private IPv4 blocks and IPv6 unique-local.
 * @remarks Literal inspection only. A public name that resolves to a private
 *   address still gets through, which is why this is a guard rather than a
 *   guarantee — the deployment's egress rules are the real boundary.
 *
 * The last IPv4 pattern is carrier-grade NAT, which is also the range cloud
 * metadata services live in. The final expression matches IPv6 unique-local
 * (`fc00::/7`) and link-local (`fe80::/10`).
 */
export function isPrivateHost(hostname: string): boolean {
  if (LOOPBACK_NAMES.has(hostname)) return true;
  if (hostname.endsWith('.localhost') || hostname.endsWith('.internal')) return true;
  if (PRIVATE_V4.some((pattern) => pattern.test(hostname))) return true;
  return /^\[?(f[cd][0-9a-f]{2}|fe[89ab][0-9a-f]):/i.test(hostname);
}

/**
 * Parses and vets a resource URL.
 *
 * @param raw - URL as the caller supplied it.
 * @param allowPrivateHosts - Whether this deployment may fetch private
 *   addresses. True for local development, where the seller runs on
 *   `localhost`; false anywhere reachable from outside.
 * @returns The parsed URL.
 * @throws {PocketError} `VALIDATION_FAILED` when the URL is malformed, uses a
 *   scheme other than HTTP, or names a destination this deployment refuses.
 */
export function parseResourceUrl(raw: string, allowPrivateHosts: boolean): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new PocketError('VALIDATION_FAILED', 'The resource URL is not a valid URL.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new PocketError('VALIDATION_FAILED', 'The resource URL must use http or https.', {
      protocol: url.protocol,
    });
  }

  if (!allowPrivateHosts && isPrivateHost(url.hostname)) {
    throw new PocketError(
      'VALIDATION_FAILED',
      'This deployment will not fetch resources on private or loopback addresses.',
      { host: url.hostname },
    );
  }

  return url;
}

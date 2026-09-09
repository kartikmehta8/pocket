/**
 * Server-side identifier generation.
 *
 * Identifiers are always minted by Purse, never accepted from a client, and
 * carry a type prefix so a stray id in a log line is self-describing.
 */

import { randomBytes, randomUUID } from 'node:crypto';

/** Entity kinds that own a prefixed identifier. */
export type IdPrefix =
  'org' | 'agent' | 'wal' | 'bud' | 'pol' | 'pay' | 'apr' | 'aud' | 'key' | 'task' | 'user';

/**
 * Mints a prefixed, URL-safe identifier.
 *
 * @param prefix - Entity kind, for example `"pay"`.
 * @returns An identifier such as `pay_3f9a1c8e5b2d47a0`.
 */
export function newId(prefix: IdPrefix): string {
  return `${prefix}_${randomBytes(8).toString('hex')}`;
}

/**
 * Mints an organization API key.
 *
 * @returns The plaintext key, shown to the caller exactly once. Only its hash
 *   is persisted; see `hashApiKey` in `@purse/db`.
 */
export function newApiKey(): string {
  return `purse_sk_${randomUUID().replaceAll('-', '')}${randomBytes(8).toString('hex')}`;
}

/** Extracts the human-readable prefix stored alongside a hashed API key. */
export function apiKeyPrefix(plaintext: string): string {
  return plaintext.slice(0, 16);
}

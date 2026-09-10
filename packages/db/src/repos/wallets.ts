/**
 * Wallet rows.
 *
 * A wallet belongs to exactly one agent and holds no secret: the provider
 * custodies the private key, and what is stored here is the address, the
 * provider's handle for it, and the public key Hedera needs to name the
 * account before it has ever signed anything.
 */

import { eq } from 'drizzle-orm';
import { newId, type Wallet } from '@pocket/core';
import type { Database, Transaction } from '../client.js';
import { wallets } from '../schema/index.js';

/**
 * Records a provisioned wallet against an agent.
 *
 * @param db - Database or transaction handle.
 * @param input - Provider identifiers and the public address. No secrets.
 * @returns The persisted wallet row.
 */
export async function attachWallet(
  db: Database | Transaction,
  input: Omit<Wallet, 'id' | 'createdAt'>,
): Promise<Wallet> {
  const [row] = await db
    .insert(wallets)
    .values({ id: newId('wal'), ...input })
    .returning();
  if (row === undefined) throw new Error('Wallet insert returned no row.');
  return row;
}

/**
 * Records a wallet's public key once it has been derived.
 *
 * @param db - Database handle.
 * @param walletId - Wallet to fill in.
 * @param publicKey - Compressed secp256k1 public key, `0x`-prefixed.
 * @returns Nothing. Wallets provisioned before the key was captured derive it
 *   on demand; storing it here means they pay for that only once.
 */
export async function recordWalletPublicKey(
  db: Database,
  walletId: string,
  publicKey: string,
): Promise<void> {
  await db.update(wallets).set({ publicKey }).where(eq(wallets.id, walletId));
}

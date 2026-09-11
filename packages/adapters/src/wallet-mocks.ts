/**
 * Deterministic wallet provider.
 *
 * Signs nothing and holds nothing of value. Addresses and public keys are pure
 * functions of the agent id, so a test or an offline demo replays identically
 * every time.
 */

import { createHash } from 'node:crypto';
import type {
  AssetId,
  AssociateTokenInput,
  ChainId,
  CompleteAccountInput,
  ProvisionedWallet,
  SendPaymentInput,
  SubmittedTransaction,
  WalletProvider,
} from '@pocket/core';

/** Derives a stable fake address from any seed, so a demo replays identically. */
function deterministicAddress(seed: string): string {
  return `0x${createHash('sha256').update(seed).digest('hex').slice(0, 40)}`;
}

/**
 * Derives a stable fake compressed public key from any seed.
 *
 * @remarks Well-formed in shape only — 33 bytes with a valid prefix. Nothing
 * verifies it against the address, because nothing in the fake path signs.
 */
function deterministicPublicKey(seed: string): string {
  return `0x02${createHash('sha256').update(`pk:${seed}`).digest('hex').slice(0, 64)}`;
}

/** In-memory wallet provider. Signs nothing and holds nothing of value. */
export class MockWalletProvider implements WalletProvider {
  public readonly name = 'mock';
  readonly #sent: SendPaymentInput[] = [];
  readonly #associated = new Set<string>();
  readonly #completed = new Set<string>();

  /**
   * Returns a deterministic address for the agent.
   *
   * @param input - Owning organization, agent and chain.
   * @returns A provisioned wallet whose address is a pure function of the agent id.
   */
  public createWallet(input: {
    orgId: string;
    agentId: string;
    chain: ChainId;
  }): Promise<ProvisionedWallet> {
    return Promise.resolve({
      providerWalletId: `mockwallet_${input.agentId}`,
      address: deterministicAddress(input.agentId),
      publicKey: deterministicPublicKey(input.agentId),
    });
  }

  /**
   * Returns the same fake public key the wallet was provisioned with.
   *
   * @param input - Provider wallet id, from which the agent id is recovered.
   * @returns A deterministic compressed public key.
   */
  public publicKeyFor(input: { providerWalletId: string; address: string }): Promise<string> {
    return Promise.resolve(
      deterministicPublicKey(input.providerWalletId.replace(/^mockwallet_/, '')),
    );
  }

  /**
   * Records a transfer and returns a synthetic hash.
   *
   * @param input - The transfer instruction.
   * @returns A synthetic transaction hash derived from the idempotency key, so
   *   a replayed instruction yields the same hash.
   */
  public sendPayment(input: SendPaymentInput): Promise<SubmittedTransaction> {
    this.#sent.push(input);
    return Promise.resolve({
      txHash: `0x${createHash('sha256').update(input.idempotencyKey).digest('hex')}`,
    });
  }

  /**
   * Records an association and returns a synthetic hash.
   *
   * @param input - Wallet, asset and chain.
   * @returns A synthetic transaction, or `null` for a native asset.
   */
  public associateToken(input: AssociateTokenInput): Promise<SubmittedTransaction | null> {
    if (input.asset === 'HBAR') return Promise.resolve(null);
    this.#associated.add(`${input.address.toLowerCase()}:${input.asset}`);
    return Promise.resolve({
      txHash: `0x${createHash('sha256').update(`associate:${input.idempotencyKey}`).digest('hex')}`,
    });
  }

  /** Whether this provider was asked to associate an address with an asset. */
  public hasAssociated(address: string, asset: AssetId): boolean {
    return this.#associated.has(`${address.toLowerCase()}:${asset}`);
  }

  /**
   * Records a completion and returns a synthetic hash.
   *
   * @param input - Wallet and chain.
   * @returns A synthetic transaction.
   */
  public completeAccount(input: CompleteAccountInput): Promise<SubmittedTransaction | null> {
    this.#completed.add(input.address.toLowerCase());
    return Promise.resolve({
      txHash: `0x${createHash('sha256').update(`complete:${input.idempotencyKey}`).digest('hex')}`,
    });
  }

  /** Whether this provider was asked to publish an address's key. */
  public hasCompleted(address: string): boolean {
    return this.#completed.has(address.toLowerCase());
  }

  /** Every transfer this provider was asked to make, for assertions in tests. */
  public get sent(): readonly SendPaymentInput[] {
    return this.#sent;
  }
}

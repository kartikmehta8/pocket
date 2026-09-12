/**
 * The Privy wallet adapter.
 *
 * Privy holds custody. Pocket never sees a private key, and no signing material
 * ever reaches the language model, the database or a log line. Privy's own
 * policy engine is installed as a second, provider-side ceiling underneath
 * Pocket's application policy, so a bug in Pocket cannot by itself authorise an
 * unbounded transfer.
 */

import { PrivyClient } from '@privy-io/server-auth';
import {
  type AssociateTokenInput,
  type CompleteAccountInput,
  type ProvisionedWallet,
  type SendPaymentInput,
  type SubmittedTransaction,
  type WalletProvider,
  type ChainId,
} from '@pocket/core';
import { chainConfig } from './chains.js';
import { createWalletPolicy } from './privy-policy.js';
import { publicKeyForWallet } from './secp256k1-key.js';
import { provisionPrivyWallet, sendPrivyTransaction, signPrivyDigest } from './privy-provision.js';
import {
  buildAssociateTransaction,
  buildCompleteAccountTransaction,
  buildTransferTransaction,
} from './privy-transactions.js';

/** Options for {@link PrivyWalletProvider}. */
export interface PrivyOptions {
  appId: string;
  appSecret: string;
  /**
   * Privy authorization key, `wallet-auth:`-prefixed base64 DER.
   *
   * @remarks Optional. Privy requires a request signature only when a wallet
   * has an owner, and {@link PrivyWalletProvider.createWallet} creates
   * app-owned wallets with none. Supply it to bind wallet actions to a key
   * this server holds.
   */
  authorizationPrivateKey?: string | undefined;
  /** Per-transaction ceiling installed as a Privy-side policy, in wei. */
  providerCeilingWei?: bigint | undefined;
  /** Reuse this policy instead of creating one. Set from `PRIVY_POLICY_ID`. */
  policyId?: string | undefined;
}

/** Wallet provider backed by Privy server wallets. */
export class PrivyWalletProvider implements WalletProvider {
  public readonly name = 'privy';
  readonly #privy: PrivyClient;
  readonly #ceilingWei: bigint;
  readonly #configuredPolicyId: string | undefined;
  #policyId: string | null = null;

  /**
   * @param options - Privy application credentials and the provider-side ceiling.
   */
  public constructor(options: PrivyOptions) {
    this.#privy = new PrivyClient(options.appId, options.appSecret, {
      walletApi:
        options.authorizationPrivateKey === undefined
          ? undefined
          : { authorizationPrivateKey: options.authorizationPrivateKey },
    });
    this.#ceilingWei = options.providerCeilingWei ?? 10n ** 18n;
    this.#configuredPolicyId = options.policyId;
  }

  /**
   * Resolves the Privy-side policy to attach to new wallets.
   *
   * @returns The policy id, or `null` when none could be established.
   * @remarks Set `PRIVY_POLICY_ID` to pin an existing policy rather than
   * minting a new one on every process start.
   */
  async #ensurePolicy(): Promise<string | null> {
    if (this.#policyId !== null) return this.#policyId;
    if (this.#configuredPolicyId !== undefined) {
      this.#policyId = this.#configuredPolicyId;
      return this.#policyId;
    }
    this.#policyId = await createWalletPolicy(this.#privy, { ceilingWei: this.#ceilingWei });
    return this.#policyId;
  }

  /**
   * Provisions a Privy-custodied Ethereum-compatible wallet.
   *
   * @param input - Owning organization, agent and target chain.
   * @returns The provider wallet id and public address. Never a secret.
   * @throws {PocketError} `UPSTREAM_UNAVAILABLE` when Privy cannot be reached.
   */
  public async createWallet(input: {
    orgId: string;
    agentId: string;
    chain: ChainId;
  }): Promise<ProvisionedWallet> {
    const policyId = await this.#ensurePolicy();
    const wallet = await provisionPrivyWallet(this.#privy, { policyId, agentId: input.agentId });
    const publicKey = await this.publicKeyFor({
      providerWalletId: wallet.id,
      address: wallet.address,
    });
    return { providerWalletId: wallet.id, address: wallet.address, publicKey };
  }

  /**
   * Reveals the wallet's compressed public key.
   *
   * @param input - Provider wallet id and the address it must hash to.
   * @returns The `0x`-prefixed 33-byte compressed public key.
   * @throws {PocketError} `PAYMENT_FAILED` when Privy will not sign, or
   *   `VALIDATION_FAILED` when the signature recovers to a different address.
   */
  public publicKeyFor(input: { providerWalletId: string; address: string }): Promise<string> {
    return publicKeyForWallet(
      (digest) => signPrivyDigest(this.#privy, input.providerWalletId, digest),
      input.address,
    );
  }

  /**
   * Signs a 32-byte digest with the wallet's secp256k1 key.
   *
   * @param walletId - Provider wallet identifier.
   * @param digest - `0x`-prefixed 32-byte hash to sign.
   * @returns The `0x`-prefixed signature. 65 bytes: r, s and the recovery byte.
   * @remarks Part of the provider's surface because the x402 signer reaches
   *   for it through the wallet port, not only through this class.
   */
  public signDigest(walletId: string, digest: `0x${string}`): Promise<string> {
    return signPrivyDigest(this.#privy, walletId, digest);
  }

  /**
   * Opts the wallet into holding a token.
   *
   * @param input - Wallet, asset and chain.
   * @returns The broadcast transaction, or `null` when the asset is native and
   *   association does not apply.
   * @throws {PocketError} `VALIDATION_FAILED` when the token has no configured
   *   contract address, or `PAYMENT_FAILED` when Privy rejects the call.
   */
  public async associateToken(input: AssociateTokenInput): Promise<SubmittedTransaction | null> {
    const built = buildAssociateTransaction(input);
    if (built === null) return null;
    return await sendPrivyTransaction(this.#privy, {
      ...input,
      transaction: built,
      refusal: 'Privy rejected the token association.',
    });
  }

  /**
   * Signs and broadcasts a value transfer through Privy.
   *
   * @param input - Wallet, recipient, amount in base units, asset and chain.
   * @returns The broadcast transaction hash.
   * @throws {PocketError} `VALIDATION_FAILED` when a token asset has no
   *   configured contract address, or `PAYMENT_FAILED` when Privy rejects the
   *   transaction, including when its own policy denies it.
   */
  public async sendPayment(input: SendPaymentInput): Promise<SubmittedTransaction> {
    return await sendPrivyTransaction(this.#privy, {
      ...input,
      transaction: buildTransferTransaction(input),
      refusal: 'Privy rejected the transaction.',
    });
  }

  /**
   * Publishes the wallet's key on chain by signing a transfer of nothing.
   *
   * @param input - Wallet and chain.
   * @returns The broadcast transaction.
   * @throws {PocketError} `PAYMENT_FAILED` when Privy rejects the call, which
   *   for this transaction almost always means the wallet has no HBAR to pay
   *   the gas with.
   * @remarks Nothing moves, but the send helper labels every transaction with
   *   an asset for its error reporting, and the gas asset is the honest label.
   */
  public async completeAccount(input: CompleteAccountInput): Promise<SubmittedTransaction | null> {
    return await sendPrivyTransaction(this.#privy, {
      ...input,
      asset: chainConfig(input.chain).nativeAsset,
      transaction: buildCompleteAccountTransaction(input),
      refusal: 'Privy rejected the account completion.',
    });
  }
}

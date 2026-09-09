/**
 * Chain configuration.
 *
 * Hedera exposes an Ethereum-compatible JSON-RPC relay, so Pocket addresses it
 * with ordinary EVM tooling: EIP-155 chain ids, CAIP-2 identifiers for Privy,
 * and `0x` addresses throughout.
 */

import type { AssetId, ChainId } from '@pocket/core';

/** Everything needed to read from and settle on one chain. */
export interface ChainConfig {
  readonly chain: ChainId;
  /** EIP-155 chain id. */
  readonly chainId: number;
  /** CAIP-2 identifier, the form Privy's wallet API expects. */
  readonly caip2: `eip155:${string}`;
  /** JSON-RPC relay endpoint. */
  readonly rpcUrl: string;
  /** Base URL for human-readable transaction links. */
  readonly explorerBase: string;
  /** The chain's gas asset, transferred as native value rather than a token. */
  readonly nativeAsset: AssetId;
}

/** Static configuration per supported chain. */
export const CHAIN_CONFIGS: Readonly<Record<ChainId, ChainConfig>> = {
  'hedera-testnet': {
    chain: 'hedera-testnet',
    chainId: 296,
    caip2: 'eip155:296',
    rpcUrl: process.env['HEDERA_RPC_URL'] ?? 'https://testnet.hashio.io/api',
    explorerBase: 'https://hashscan.io/testnet/transaction',
    nativeAsset: 'HBAR',
  },
  'hedera-mainnet': {
    chain: 'hedera-mainnet',
    chainId: 295,
    caip2: 'eip155:295',
    rpcUrl: process.env['HEDERA_MAINNET_RPC_URL'] ?? 'https://mainnet.hashio.io/api',
    explorerBase: 'https://hashscan.io/mainnet/transaction',
    nativeAsset: 'HBAR',
  },
};

/**
 * Resolves a chain's configuration.
 *
 * @param chain - Supported chain identifier.
 * @returns The chain's configuration.
 */
export function chainConfig(chain: ChainId): ChainConfig {
  return CHAIN_CONFIGS[chain];
}

/**
 * Resolves the ERC-20 contract address for a token asset on a chain.
 *
 * @param chain - Supported chain identifier.
 * @param asset - Asset to resolve.
 * @returns The contract address, or `null` when the asset is the chain's
 *   native currency and therefore has no contract.
 * @remarks Token addresses come from configuration rather than a hard-coded
 *   table, because a testnet token address is a deployment detail, not a
 *   property of the protocol.
 */
export function tokenAddress(chain: ChainId, asset: AssetId): string | null {
  if (asset === CHAIN_CONFIGS[chain].nativeAsset) return null;
  const key = chain === 'hedera-mainnet' ? 'HEDERA_MAINNET_USDC_ADDRESS' : 'HEDERA_USDC_ADDRESS';
  return process.env[key] ?? null;
}

/**
 * Converts a Hedera token id to its EVM address.
 *
 * @param tokenId - Native id such as `0.0.429274`.
 * @returns The 20-byte address form, or `null` when the id is malformed.
 * @remarks Hedera gives every entity two names for the same thing. The EVM
 * address is just the entity number in hex, left-padded, so this is arithmetic
 * rather than a lookup table that could drift.
 */
export function tokenIdToEvmAddress(tokenId: string): string | null {
  const parts = tokenId.split('.');
  const num = parts.length === 3 ? Number(parts[2]) : Number.NaN;
  if (!Number.isInteger(num) || num < 0) return null;
  return `0x${num.toString(16).padStart(40, '0')}`;
}

/**
 * Resolves a Hedera token id to a Pocket asset ticker.
 *
 * @param chain - Chain the token lives on.
 * @param tokenId - Native token id, or `HBAR` for the native asset.
 * @returns The asset ticker, or `null` when the token is not configured.
 * @remarks Comparison goes through the configured contract address rather than
 * a hard-coded id, so pointing Pocket at a different token needs no code change.
 */
export function assetForTokenId(chain: ChainId, tokenId: string): AssetId | null {
  if (tokenId === 'HBAR' || tokenId === CHAIN_CONFIGS[chain].nativeAsset) {
    return CHAIN_CONFIGS[chain].nativeAsset;
  }
  const evm = tokenIdToEvmAddress(tokenId);
  if (evm === null) return null;
  for (const asset of ['USDC'] as const) {
    const configured = tokenAddress(chain, asset);
    if (configured !== null && configured.toLowerCase() === evm.toLowerCase()) return asset;
  }
  return null;
}

/**
 * HIP-719 facade selectors, called on a token's own address.
 *
 * Hedera requires an account to opt into a token before it can hold or receive
 * it. HIP-719 exposes that from the EVM by making the token address answer
 * `associate()` and `isAssociated()`, so an ordinary EVM signer can opt itself
 * in without a native Hedera transaction.
 */
export const IHRC719_ASSOCIATE: `0x${string}` = '0x0a754de6';

/** `isAssociated()` selector. Returns 1 when the caller holds the association. */
export const IHRC719_IS_ASSOCIATED: `0x${string}` = '0x4d8fdd6d';

/** Minimal ERC-20 surface Pocket needs: move tokens and read a balance. */
export const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
] as const;

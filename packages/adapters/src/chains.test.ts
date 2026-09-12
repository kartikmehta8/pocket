/**
 * Hedera's two names for the same thing.
 *
 * Every entity has an entity id and an EVM address, and the two are the same
 * number in different bases. Pocket provisions wallets by address and settles
 * by id, so the translation is load-bearing: get it wrong and a payment is
 * addressed to a token nobody holds.
 *
 * Resolution goes through the configured contract address rather than a
 * hard-coded id, so pointing a deployment at a different token needs no code
 * change — and a token nothing is configured for resolves to nothing rather
 * than to a guess.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

const USDC_TESTNET = '0x0000000000000000000000000000000000068cda';

/** Imports the module fresh, because it reads the token address at import. */
async function chains(address?: string) {
  vi.resetModules();
  vi.stubEnv('HEDERA_USDC_ADDRESS', address);
  return import('./chains.js');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('tokenIdToEvmAddress', () => {
  it('renders the entity number as a padded address', async () => {
    const { tokenIdToEvmAddress } = await chains(USDC_TESTNET);

    expect(tokenIdToEvmAddress('0.0.429274')).toBe(USDC_TESTNET);
    expect(tokenIdToEvmAddress('0.0.0')).toBe(`0x${'0'.repeat(40)}`);
    expect(tokenIdToEvmAddress('0.0.1')).toBe(`0x${'0'.repeat(39)}1`);
  });

  it('refuses an id that is not one, rather than addressing zero', async () => {
    const { tokenIdToEvmAddress } = await chains(USDC_TESTNET);

    for (const bad of ['', '0.0', '0.0.x', 'HBAR', '0.0.-1', '0.0.1.2', '0.0.1.5']) {
      expect(tokenIdToEvmAddress(bad), bad).toBeNull();
    }
  });
});

describe('chainConfig', () => {
  it('knows both chains and names the native asset on each', async () => {
    const { chainConfig } = await chains(USDC_TESTNET);

    expect(chainConfig('hedera-testnet').nativeAsset).toBe('HBAR');
    expect(chainConfig('hedera-mainnet').nativeAsset).toBe('HBAR');
    expect(chainConfig('hedera-testnet').chainId).not.toBe(chainConfig('hedera-mainnet').chainId);
  });
});

describe('tokenAddress', () => {
  it('answers the configured address for a token', async () => {
    const { tokenAddress } = await chains(USDC_TESTNET);

    expect(tokenAddress('hedera-testnet', 'USDC')).toBe(USDC_TESTNET);
  });

  it('answers nothing for the native asset, which has no contract', async () => {
    const { tokenAddress } = await chains(USDC_TESTNET);

    expect(tokenAddress('hedera-testnet', 'HBAR')).toBeNull();
  });

  it('answers nothing when the deployment configured no token', async () => {
    const { tokenAddress } = await chains();

    expect(tokenAddress('hedera-testnet', 'USDC')).toBeNull();
  });
});

describe('assetForTokenId', () => {
  it('recognises the native asset by either name', async () => {
    const { assetForTokenId } = await chains(USDC_TESTNET);

    expect(assetForTokenId('hedera-testnet', 'HBAR')).toBe('HBAR');
  });

  it('recognises the configured token by its id', async () => {
    const { assetForTokenId } = await chains(USDC_TESTNET);

    expect(assetForTokenId('hedera-testnet', '0.0.429274')).toBe('USDC');
  });

  it('matches whatever address the deployment configured, not a fixed id', async () => {
    const other = '0x0000000000000000000000000000000000000141';
    const { assetForTokenId } = await chains(other);

    expect(assetForTokenId('hedera-testnet', '0.0.321')).toBe('USDC');
    expect(assetForTokenId('hedera-testnet', '0.0.429274')).toBeNull();
  });

  it('answers nothing for a token the deployment does not settle in', async () => {
    const { assetForTokenId } = await chains(USDC_TESTNET);

    expect(assetForTokenId('hedera-testnet', '0.0.999999')).toBeNull();
    expect(assetForTokenId('hedera-testnet', 'not-an-id')).toBeNull();
  });

  it('answers nothing when no token is configured at all', async () => {
    const { assetForTokenId } = await chains();

    expect(assetForTokenId('hedera-testnet', '0.0.429274')).toBeNull();
  });
});

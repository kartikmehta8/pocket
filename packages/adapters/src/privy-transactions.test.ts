/**
 * The unit conversion that decides how much money actually leaves a wallet.
 *
 * An EVM `value` is denominated in wei whatever the chain's own accounting
 * uses. Hedera keeps HBAR in tinybars, ten orders of magnitude coarser, so one
 * HBAR is 1e8 tinybars and 1e18 weibars. Getting that wrong does not fail — it
 * sends a ten-billionth of the intended amount, which is exactly the bug these
 * cases exist to catch.
 *
 * The environment is stubbed before the dynamic import because `chains.ts`
 * resolves the token address at import time.
 */

import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('HEDERA_USDC_ADDRESS', '0x0000000000000000000000000000000000068cda');

const { buildAssociateTransaction, buildCompleteAccountTransaction, buildTransferTransaction } =
  await import('./privy-transactions.js');

const WALLET = '0x904adDac63e8d93DC850A0AE2474b94eb3b0360E';
const RECIPIENT = '0x74d4b0761C683C9A0038243dF16B238548C0D66C';

/** The fields every one of these transactions shares. */
const base = {
  providerWalletId: 'w_1',
  from: WALLET,
  to: RECIPIENT,
  chain: 'hedera-testnet' as const,
  idempotencyKey: 'k',
};

describe('buildTransferTransaction', () => {
  describe('a native transfer', () => {
    it('converts 1e8 tinybars into 1e18 weibars', () => {
      const tx = buildTransferTransaction({ ...base, amount: 100_000_000n, asset: 'HBAR' });
      expect(BigInt(tx.value)).toBe(1_000_000_000_000_000_000n);
    });

    it('does not send two HBAR as 0.0000000002', () => {
      const tx = buildTransferTransaction({ ...base, amount: 200_000_000n, asset: 'HBAR' });
      expect(BigInt(tx.value)).not.toBe(200_000_000n);
      expect(BigInt(tx.value)).toBe(2n * 10n ** 18n);
    });

    it('keeps one tinybar, the relay floor, from rounding to zero', () => {
      const tx = buildTransferTransaction({ ...base, amount: 1n, asset: 'HBAR' });
      expect(BigInt(tx.value)).toBe(10_000_000_000n);
    });

    it('sends nothing when asked for nothing', () => {
      const tx = buildTransferTransaction({ ...base, amount: 0n, asset: 'HBAR' });
      expect(BigInt(tx.value)).toBe(0n);
    });

    it('addresses the recipient directly, with no calldata', () => {
      const tx = buildTransferTransaction({ ...base, amount: 1n, asset: 'HBAR' });
      expect(tx.to).toBe(RECIPIENT);
      expect(tx.data).toBeUndefined();
    });
  });

  describe('a token transfer', () => {
    it('leaves 1e6 of USDC in calldata untouched by the weibar conversion', () => {
      const tx = buildTransferTransaction({ ...base, amount: 1_000_000n, asset: 'USDC' });
      expect(BigInt(tx.value)).toBe(0n);
      expect(tx.data).toContain(1_000_000n.toString(16));
    });

    it('addresses the token contract rather than the recipient', () => {
      const tx = buildTransferTransaction({ ...base, amount: 1_000_000n, asset: 'USDC' });
      expect(tx.to).not.toBe(RECIPIENT);
      expect(tx.data?.startsWith('0xa9059cbb')).toBe(true);
    });
  });
});

describe('buildCompleteAccountTransaction', () => {
  const built = buildCompleteAccountTransaction({
    providerWalletId: 'w_1',
    address: WALLET,
    chain: 'hedera-testnet',
    idempotencyKey: 'k',
  });

  it('moves nothing, so publishing a key costs only gas', () => {
    expect(BigInt(built.value)).toBe(0n);
    expect(built.data).toBeUndefined();
  });

  it('addresses the wallet itself', () => {
    expect(built.to).toBe(WALLET);
  });

  it('asks for no more gas than a bare transfer needs', () => {
    expect(built.gasLimit).toBe(21_000);
  });
});

describe('buildAssociateTransaction', () => {
  it('calls the facade on the token’s own address', () => {
    const tx = buildAssociateTransaction({
      providerWalletId: 'w_1',
      address: WALLET,
      asset: 'USDC',
      chain: 'hedera-testnet',
      idempotencyKey: 'k',
    });

    expect(tx?.to).toBe('0x0000000000000000000000000000000000068cda');
    expect(tx?.value).toBe('0x0');
    expect(tx?.gasLimit).toBe(1_000_000);
  });

  it('does nothing for the native asset, which needs no association', () => {
    expect(
      buildAssociateTransaction({
        providerWalletId: 'w_1',
        address: WALLET,
        asset: 'HBAR',
        chain: 'hedera-testnet',
        idempotencyKey: 'k',
      }),
    ).toBeNull();
  });
});

describe('a token with no configured address', () => {
  it('refuses to build a transfer rather than sending to nowhere', () => {
    expect(() =>
      buildTransferTransaction({ ...base, amount: 1n, asset: 'USDC', chain: 'hedera-mainnet' }),
    ).toThrow(/No contract address configured/);
  });

  it('refuses to build an association for the same reason', () => {
    expect(() =>
      buildAssociateTransaction({
        providerWalletId: 'w_1',
        address: WALLET,
        asset: 'USDC',
        chain: 'hedera-mainnet',
        idempotencyKey: 'k',
      }),
    ).toThrow(/No contract address configured/);
  });
});

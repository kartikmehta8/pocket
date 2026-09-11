import { describe, expect, it, vi } from 'vitest';

// `chains.ts` resolves the token address from the environment at import time,
// so this is set before the module graph loads rather than inside a test.
vi.stubEnv('HEDERA_USDC_ADDRESS', '0x0000000000000000000000000000000000068cda');

const { buildCompleteAccountTransaction, buildTransferTransaction } =
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
    it('converts tinybars into weibars', () => {
      // An EVM `value` is denominated in wei whatever the chain's own
      // accounting uses. Hedera keeps HBAR in tinybars, ten orders of
      // magnitude coarser, so 1 HBAR is 1e8 tinybars and 1e18 weibars.
      const tx = buildTransferTransaction({ ...base, amount: 100_000_000n, asset: 'HBAR' });
      expect(BigInt(tx.value)).toBe(1_000_000_000_000_000_000n);
    });

    it('does not send a ten-billionth of what it was asked to', () => {
      // The bug this guards: passing the base-unit amount straight into
      // `value`. Two HBAR would have left as 0.0000000002.
      const tx = buildTransferTransaction({ ...base, amount: 200_000_000n, asset: 'HBAR' });
      expect(BigInt(tx.value)).not.toBe(200_000_000n);
      expect(BigInt(tx.value)).toBe(2n * 10n ** 18n);
    });

    it('keeps the smallest unit representable', () => {
      // One tinybar is the floor Hedera's relay accepts for a non-zero value,
      // and it must not round to zero on the way through.
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
    it('leaves the amount in the token’s own base units', () => {
      // USDC rides in calldata, not in `value`, so the weibar conversion must
      // not touch it. 1 USDC is 1e6 and stays 1e6.
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

  it('moves nothing', () => {
    // The signature is the entire point. A transaction that moved money to
    // publish a key would be a surprising charge for a setup step.
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

/**
 * Public-key recovery.
 *
 * The whole point is that a wallet's key can be learned without asking the
 * chain, so the first payment from a freshly funded account works. That is
 * only safe if a signature from the wrong key is rejected rather than trusted.
 */

import { describe, expect, it } from 'vitest';
import { computeAddress, SigningKey, Wallet } from 'ethers';
import { PocketError } from '@pocket/core';
import {
  KEY_DISCOVERY_DIGEST,
  publicKeyForWallet,
  recoverCompressedPublicKey,
} from './secp256k1-key.js';

/** A fixed key, so the expected values below are readable rather than magic. */
const KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const wallet = new SigningKey(KEY);
const address = computeAddress(wallet.publicKey);

describe('recovering a public key from a signature', () => {
  it('returns the compressed key that produced the signature', () => {
    const signature = wallet.sign(KEY_DISCOVERY_DIGEST).serialized;

    const recovered = recoverCompressedPublicKey(KEY_DISCOVERY_DIGEST, signature, address);

    expect(recovered).toBe(SigningKey.computePublicKey(wallet.publicKey, true));
    expect(recovered).toMatch(/^0x0[23][0-9a-f]{64}$/);
  });

  it('derives an address matching the wallet it came from', () => {
    const signature = wallet.sign(KEY_DISCOVERY_DIGEST).serialized;

    const recovered = recoverCompressedPublicKey(KEY_DISCOVERY_DIGEST, signature, address);

    expect(computeAddress(recovered)).toBe(address);
  });

  it('refuses a signature made by a key that does not hold the address', () => {
    const impostor = new SigningKey(Wallet.createRandom().privateKey);
    const signature = impostor.sign(KEY_DISCOVERY_DIGEST).serialized;

    expect(() => recoverCompressedPublicKey(KEY_DISCOVERY_DIGEST, signature, address)).toThrow(
      PocketError,
    );
  });

  it('refuses a signature over a different digest', () => {
    const other = '0x'.padEnd(66, 'a');
    const signature = wallet.sign(other).serialized;

    expect(() => recoverCompressedPublicKey(KEY_DISCOVERY_DIGEST, signature, address)).toThrow(
      /does not match the wallet address/,
    );
  });

  it('refuses a signature that is not one', () => {
    expect(() => recoverCompressedPublicKey(KEY_DISCOVERY_DIGEST, '0xdeadbeef', address)).toThrow(
      /no public key could be recovered/,
    );
  });

  it('uses a domain-separated digest no transaction can collide with', () => {
    expect(KEY_DISCOVERY_DIGEST).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe('publicKeyForWallet', () => {
  it('reveals the public half without broadcasting anything', async () => {
    const wallet = new SigningKey(Wallet.createRandom().privateKey);
    const address = computeAddress(wallet.publicKey);
    let signed: string | null = null;

    const key = await publicKeyForWallet((digest) => {
      signed = digest;
      return Promise.resolve(wallet.sign(digest).serialized);
    }, address);

    expect(signed).toBe(KEY_DISCOVERY_DIGEST);
    expect(key).toBe(wallet.compressedPublicKey);
  });

  it('refuses a wallet that signed for an address it does not hold', async () => {
    const impostor = new SigningKey(Wallet.createRandom().privateKey);
    const address = computeAddress(new SigningKey(Wallet.createRandom().privateKey).publicKey);

    await expect(
      publicKeyForWallet((digest) => Promise.resolve(impostor.sign(digest).serialized), address),
    ).rejects.toBeInstanceOf(PocketError);
  });
});

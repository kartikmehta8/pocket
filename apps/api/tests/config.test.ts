/**
 * Configuration, as an operator actually writes it.
 *
 * Most of this project's `.env` is meant to be left blank: a blank vendor key
 * is how an adapter is told to fall back to its in-memory twin. So a blank has
 * to mean "use the default", not "refuse to start".
 *
 * Half a treasury pays nobody and explains nothing: the operator is told their
 * agent "arrived empty" and cannot tell a typo from a switch. Validating at
 * boot is what makes that visible — otherwise it throws at the moment of the
 * transfer instead, after an agent has been created and cannot be un-created.
 */

import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const base = { DATABASE_URL: 'postgres://pocket:pocket@localhost:5434/pocket_test' };

describe('blank variables', () => {
  it('starts when the optional ones are present but empty', () => {
    const config = loadConfig({
      ...base,
      PORT: '',
      LOG_LEVEL: '',
      CHAIN: '',
      RATE_LIMIT_MAX: '',
      HEDERA_MIRROR_URL: '',
      ALLOW_PRIVATE_RESOURCE_HOSTS: '',
    });
    expect(config.PORT).toBe(8080);
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.CHAIN).toBe('hedera-testnet');
    expect(config.RATE_LIMIT_MAX).toBe(120);
  });

  it('treats whitespace as blank, because a stray space is still empty', () => {
    expect(loadConfig({ ...base, LOG_LEVEL: '   ' }).LOG_LEVEL).toBe('info');
  });

  it('still refuses a value that is wrong rather than absent', () => {
    expect(() => loadConfig({ ...base, CHAIN: 'ethereum' })).toThrow(/CHAIN/);
  });

  it('still refuses to start with no database at all', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });
});

describe('the private-host guard', () => {
  it('is off in production when the variable is blank', () => {
    const config = loadConfig({
      ...base,
      NODE_ENV: 'production',
      ALLOW_PRIVATE_RESOURCE_HOSTS: '',
    });
    expect(config.ALLOW_PRIVATE_RESOURCE_HOSTS).toBe(false);
  });

  it('is off in production when the variable is missing', () => {
    expect(loadConfig({ ...base, NODE_ENV: 'production' }).ALLOW_PRIVATE_RESOURCE_HOSTS).toBe(
      false,
    );
  });

  it('is on outside production, where the bundled seller is on localhost', () => {
    expect(loadConfig({ ...base, NODE_ENV: 'development' }).ALLOW_PRIVATE_RESOURCE_HOSTS).toBe(
      true,
    );
  });

  it('can still be turned on deliberately, for a seller inside a private network', () => {
    const config = loadConfig({
      ...base,
      NODE_ENV: 'production',
      ALLOW_PRIVATE_RESOURCE_HOSTS: 'true',
    });
    expect(config.ALLOW_PRIVATE_RESOURCE_HOSTS).toBe(true);
  });
});

describe('treasury configuration', () => {
  const base = { DATABASE_URL: 'postgres://localhost/x' };

  it('accepts neither half', () => {
    expect(() => loadConfig({ ...base })).not.toThrow();
  });

  it('accepts both halves', () => {
    expect(() =>
      loadConfig({
        ...base,
        TREASURY_WALLET_ID: 'w_1',
        TREASURY_ADDRESS: '0x1111111111111111111111111111111111111111',
      }),
    ).not.toThrow();
  });

  it.each([
    [
      'an address with no wallet id',
      { TREASURY_ADDRESS: '0x1111111111111111111111111111111111111111' },
    ],
    ['a wallet id with no address', { TREASURY_WALLET_ID: 'w_1' }],
  ])('refuses %s', (_case, half) => {
    expect(() => loadConfig({ ...base, ...half })).toThrow(/TREASURY_ADDRESS/);
  });

  it('refuses more precision than USDC has', () => {
    expect(() => loadConfig({ ...base, AGENT_SEED_AMOUNT: '0.0000001' })).toThrow(
      /AGENT_SEED_AMOUNT/,
    );
  });

  it('refuses a seed large enough to drain a treasury', () => {
    expect(() => loadConfig({ ...base, AGENT_SEED_AMOUNT: '1000000' })).toThrow(
      /AGENT_SEED_AMOUNT/,
    );
  });

  it('accepts the default', () => {
    expect(loadConfig({ ...base }).AGENT_SEED_AMOUNT).toBe('0.02');
  });
});

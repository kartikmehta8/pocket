/**
 * Configuration, as an operator actually writes it.
 *
 * Most of this project's `.env` is meant to be left blank: a blank vendor key
 * is how an adapter is told to fall back to its in-memory twin. So a blank has
 * to mean "use the default", not "refuse to start".
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

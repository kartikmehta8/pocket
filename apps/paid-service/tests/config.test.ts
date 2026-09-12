/**
 * Seller configuration, as an operator actually writes it.
 *
 * Half a `.env` is meant to be left blank, and Zod reads `FOO=` as an empty
 * string that satisfies no enum, no URL and no positive number. Treating empty
 * as absent is what lets those variables take their defaults instead of
 * refusing to boot over a line somebody deliberately left alone.
 *
 * A failure names the offending variables and never their values, because the
 * message ends up in a log.
 */

import { describe, expect, it } from 'vitest';

import { loadSellerConfig } from '../src/config.js';

const ADDRESS = '0xc62b618290FfAC251B70f9f4649daF933D29C226';
const MINIMAL = { PAID_SERVICE_ADDRESS: ADDRESS };

describe('loadSellerConfig', () => {
  it('needs only the address it is paid at', () => {
    const config = loadSellerConfig(MINIMAL);

    expect(config.PAID_SERVICE_ADDRESS).toBe(ADDRESS);
    expect(config.PAID_SERVICE_PORT).toBe(8402);
    expect(config.X402_ASSET_SYMBOL).toBe('USDC');
    expect(config.X402_ASSET_DECIMALS).toBe(6);
  });

  it('treats a variable left blank as one left out', () => {
    const config = loadSellerConfig({
      ...MINIMAL,
      PAID_SERVICE_PORT: '',
      X402_FACILITATOR_URL: '',
      PAID_SERVICE_PUBLIC_URL: '  ',
    });

    expect(config.PAID_SERVICE_PORT).toBe(8402);
    expect(config.X402_FACILITATOR_URL).toMatch(/^https:\/\//);
    expect(config.PAID_SERVICE_PUBLIC_URL).toBeUndefined();
  });

  it('coerces a port from the string an environment always gives', () => {
    expect(loadSellerConfig({ ...MINIMAL, PAID_SERVICE_PORT: '9000' }).PAID_SERVICE_PORT).toBe(
      9000,
    );
  });

  it('refuses to start without an address, rather than being paid nowhere', () => {
    expect(() => loadSellerConfig({})).toThrow(/PAID_SERVICE_ADDRESS/);
  });

  it('refuses an address that is not one', () => {
    expect(() => loadSellerConfig({ PAID_SERVICE_ADDRESS: '0.0.429274' })).toThrow(
      /PAID_SERVICE_ADDRESS/,
    );
  });

  it('refuses a facilitator that is not a URL', () => {
    expect(() => loadSellerConfig({ ...MINIMAL, X402_FACILITATOR_URL: 'not-a-url' })).toThrow(
      /X402_FACILITATOR_URL/,
    );
  });

  it('names the variable in the message and never its value', () => {
    const secret = 'sk-live-do-not-log-me';
    expect(() => loadSellerConfig({ ...MINIMAL, X402_FACILITATOR_URL: secret })).toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining(secret) as unknown as string,
      }),
    );
  });

  it('refuses a precision no asset has', () => {
    expect(() => loadSellerConfig({ ...MINIMAL, X402_ASSET_DECIMALS: '19' })).toThrow(
      /X402_ASSET_DECIMALS/,
    );
  });
});

/**
 * The error every layer throws, and what a client is allowed to see.
 *
 * The public body is the boundary: `cause` holds whatever the underlying
 * library said, which may name a wallet, a vendor or a host, and none of that
 * belongs in a response. The status mapping matters because the API answers
 * from it — a policy refusal that surfaced as a 500 would read as Pocket being
 * broken rather than as Pocket working.
 */

import { describe, expect, it } from 'vitest';

import { ERROR_CODES, PocketError } from '../src/errors.js';

describe('PocketError', () => {
  it('takes its HTTP status from the code', () => {
    expect(new PocketError('NOT_FOUND', 'gone').httpStatus).toBe(ERROR_CODES.NOT_FOUND);
    expect(new PocketError('UNAUTHORIZED', 'no').httpStatus).toBe(ERROR_CODES.UNAUTHORIZED);
  });

  it('keeps the cause for a log and out of the public body', () => {
    const cause = new Error('privy said 0xdeadbeef is not a wallet');
    const error = new PocketError('PAYMENT_FAILED', 'Payment failed.', undefined, cause);

    expect(error.cause).toBe(cause);
    expect(JSON.stringify(error.toPublicJSON())).not.toContain('0xdeadbeef');
  });

  it('omits details entirely when there are none', () => {
    expect(new PocketError('NOT_FOUND', 'gone').toPublicJSON()).toEqual({
      error: { code: 'NOT_FOUND', message: 'gone' },
    });
  });

  it('carries details when they are safe to show', () => {
    expect(new PocketError('NOT_FOUND', 'gone', { id: 'agent_1' }).toPublicJSON()).toEqual({
      error: { code: 'NOT_FOUND', message: 'gone', details: { id: 'agent_1' } },
    });
  });

  it('recognises itself among unknown values', () => {
    expect(PocketError.is(new PocketError('NOT_FOUND', 'gone'))).toBe(true);
    expect(PocketError.is(new Error('gone'))).toBe(false);
    expect(PocketError.is(null)).toBe(false);
    expect(PocketError.is({ code: 'NOT_FOUND' })).toBe(false);
  });

  it('maps every code to a client or server status, never to nothing', () => {
    for (const [code, status] of Object.entries(ERROR_CODES)) {
      expect(status, code).toBeGreaterThanOrEqual(400);
      expect(status, code).toBeLessThan(600);
    }
  });
});

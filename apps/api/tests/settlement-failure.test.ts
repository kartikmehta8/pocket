/**
 * What happens after the wallet has signed.
 *
 * At that point the payment sits in `approved`, which counts against the
 * agent's daily spend. A seller that goes quiet must not leave that
 * reservation standing, or one network blip costs the agent budget it never
 * spent, silently and for good.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

const payForResource = vi.hoisted(() => vi.fn());
const recordSettlement = vi.hoisted(() => vi.fn());

vi.mock('../src/services/x402-http.js', () => ({ payForResource, requestResource: vi.fn() }));
vi.mock('../src/services/x402-settle.js', () => ({ recordSettlement }));

const { presentToSeller } = await import('../src/services/x402-present.js');

/** The row `recordSettlement` hands back once the failure is written. */
const failedRow = () => ({
  id: 'pay_x',
  agentId: 'agent_x',
  amount: 10_000n,
  asset: 'USDC',
  chain: 'hedera-testnet',
  recipient: '0x000000000000000000000000000000000000dead',
  category: 'data',
  reason: 'Seller failed after signing.',
  resource: 'http://seller.invalid/v1/data',
  initiatedBy: 'agent',
  status: 'failed',
  denialCode: null,
  taskBudgetId: null,
  txHash: null,
  createdAt: new Date(),
  settledAt: null,
});

const deps = { db: {} as never, orgId: 'org_x', paymentId: 'pay_x', explorer: () => '' };
const url = new URL('http://seller.invalid/v1/data');
const payload = { x402Version: 2, accepted: {}, payload: {} } as never;

beforeEach(() => {
  vi.clearAllMocks();
  recordSettlement.mockResolvedValue(failedRow());
});

describe('a seller that fails after signing', () => {
  it('records the failure when the seller cannot be reached', async () => {
    payForResource.mockRejectedValueOnce(new Error('socket hang up'));

    const outcome = await presentToSeller(deps, url, payload);

    expect(outcome.status).toBe('failed');
    expect(outcome).toHaveProperty('code', 'UPSTREAM_UNAVAILABLE');
    expect(recordSettlement).toHaveBeenCalledWith(
      deps.db,
      'org_x',
      'pay_x',
      expect.objectContaining({ success: false }),
    );
  });

  it('records the failure when the seller refuses the payment', async () => {
    payForResource.mockResolvedValueOnce({ kind: 'rejected', status: 402, detail: 'nope' });

    const outcome = await presentToSeller(deps, url, payload);

    expect(outcome.status).toBe('failed');
    expect(outcome).toHaveProperty('code', 'SETTLEMENT_REJECTED');
    expect(recordSettlement).toHaveBeenCalledWith(
      deps.db,
      'org_x',
      'pay_x',
      expect.objectContaining({ success: false }),
    );
  });

  it('never leaves a signed payment unrecorded, whatever the seller did', async () => {
    for (const behaviour of [
      () => payForResource.mockRejectedValueOnce(new Error('timeout')),
      () => payForResource.mockRejectedValueOnce(new Error('ECONNRESET')),
      () => payForResource.mockResolvedValueOnce({ kind: 'rejected', status: 500, detail: 'x' }),
    ]) {
      vi.clearAllMocks();
      recordSettlement.mockResolvedValue(failedRow());
      behaviour();
      await presentToSeller(deps, url, payload);
      expect(recordSettlement).toHaveBeenCalledTimes(1);
    }
  });
});

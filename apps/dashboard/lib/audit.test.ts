import { describe, expect, it } from 'vitest';

import { agentIdOf, describeEvent } from './audit';
import type { AuditEvent } from './types';

function event(overrides: Partial<AuditEvent>): AuditEvent {
  return {
    id: 'evt_1',
    actorType: 'system',
    actorId: null,
    action: 'payment.settled',
    subjectType: 'payment',
    subjectId: 'pay_1',
    payload: {},
    createdAt: '2026-09-10T12:00:00.000Z',
    ...overrides,
  };
}

describe('agentIdOf', () => {
  it('reads the agent from wherever the family keeps it', () => {
    expect(agentIdOf(event({ subjectType: 'agent', subjectId: 'agent_a' }))).toBe('agent_a');
    expect(agentIdOf(event({ payload: { agentId: 'agent_b' } }))).toBe('agent_b');
    expect(agentIdOf(event({ actorType: 'agent', actorId: 'agent_c' }))).toBe('agent_c');
  });

  it('does not mistake a person for an agent', () => {
    expect(
      agentIdOf(event({ actorType: 'human', actorId: 'user_1', subjectType: 'api_key' })),
    ).toBeNull();
  });
});

describe('describeEvent', () => {
  it('names the money, the seller and the rule that stopped a refusal', () => {
    const line = describeEvent(
      event({
        action: 'payment.blocked',
        payload: {
          amount: '3',
          asset: 'HBAR',
          recipient: '0x01ead88e6fed002f75d9d986053c9efafcb8034a',
          violations: ['PER_TX_LIMIT_EXCEEDED', 'ASSET_NOT_ALLOWED'],
        },
      }),
    );
    expect(line).toContain('3 HBAR');
    expect(line).toContain('0x01ea');
    expect(line).toContain('PER_TX_LIMIT_EXCEEDED, ASSET_NOT_ALLOWED');
  });

  it('shows the paid endpoint without its scheme', () => {
    const line = describeEvent(
      event({
        action: 'payment.approved',
        payload: { amount: '0.08', asset: 'USDC', resource: 'https://pay.example/v1/research' },
      }),
    );
    expect(line).toBe('0.08 USDC · pay.example/v1/research · Allowed by policy');
  });

  it('shortens a settlement reference', () => {
    const line = describeEvent(
      event({ payload: { transactionId: '0.0.7162784@1789055890.378942874' } }),
    );
    expect(line).toBe('Settled · 0.0.716278…942874');
  });

  it('reads the rest of the families', () => {
    expect(describeEvent(event({ action: 'agent.created', payload: { name: 'Hermes' } }))).toBe(
      'Registered "Hermes"',
    );
    expect(
      describeEvent(
        event({
          action: 'budget.updated',
          payload: { asset: 'USDC', dailyLimit: '20', perTransactionLimit: '2' },
        }),
      ),
    ).toBe('Daily 20 USDC · per payment 2');
    expect(
      describeEvent(
        event({
          action: 'api_key.issued',
          payload: { label: 'MCP server', prefix: 'pocket_sk_78fd' },
        }),
      ),
    ).toBe('MCP server · pocket_sk_78fd…');
    expect(
      describeEvent(
        event({
          action: 'task_budget.created',
          payload: { label: 'Sweep', limit: '0.50', asset: 'USDC' },
        }),
      ),
    ).toBe('"Sweep" · 0.50 USDC');
  });

  it('never fails on a payload it does not recognise', () => {
    expect(describeEvent(event({ action: 'payment.failed', payload: { reason: '{}' } }))).toBe(
      'Failed before settlement',
    );
    expect(
      describeEvent(event({ action: 'something.new', subjectType: 'thing', subjectId: 'x' })),
    ).toBe('Thing x');
  });
});

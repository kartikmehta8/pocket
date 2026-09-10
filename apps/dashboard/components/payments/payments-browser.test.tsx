import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import type { AgentSummary, Payment } from '@/lib/types';

import { PaymentsBrowser, type PaymentsBrowserProps } from './payments-browser';

// The browser reaches for the app router and the live query string, neither of
// which exists outside Next. The query string is what paging links build on,
// so it is the one part the mock lets a test set.
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: () => undefined }),
  useSearchParams: () => new URLSearchParams(search),
}));

/** Strips tags so visible text can be matched. */
function text(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

function payment(overrides: Partial<Payment>): Payment {
  return {
    id: 'pay_1',
    agentId: 'agent_1',
    agentName: 'Hermes',
    amount: '0.08',
    asset: 'USDC',
    chain: 'hedera-testnet',
    recipient: '0xc62b618290ffac251b70f9f4649daf933d29c226',
    category: 'research',
    reason: 'Market brief',
    resource: 'https://pay.example/v1/research',
    initiatedBy: 'agent',
    status: 'settled',
    denialCode: null,
    txHash: null,
    explorerUrl: null,
    taskBudgetId: null,
    createdAt: '2026-09-10T12:00:00.000Z',
    settledAt: null,
    ...overrides,
  };
}

const PAYMENTS = [
  payment({ id: 'pay_1' }),
  payment({ id: 'pay_2', status: 'blocked', denialCode: 'DAILY_BUDGET_EXCEEDED' }),
];

const AGENTS = [{ id: 'agent_1', name: 'Hermes' } as AgentSummary];

const render = (props: Partial<PaymentsBrowserProps> = {}) =>
  renderToStaticMarkup(
    <TooltipProvider>
      <PaymentsBrowser
        payments={PAYMENTS}
        agents={AGENTS}
        agentId=""
        status=""
        nextCursor={null}
        page={1}
        {...props}
      />
    </TooltipProvider>,
  );

describe('PaymentsBrowser', () => {
  it('lists every payment, links the agent, and tints a refusal', () => {
    const html = render();
    expect(text(html)).toContain('Market brief');
    expect(text(html)).toContain('DAILY_BUDGET_EXCEEDED');
    expect(html).toContain('href="/agents/agent_1"');
    expect(html).toContain('bg-danger-soft/50');
  });

  it('shows no paging on a single page', () => {
    const html = text(render());
    expect(html).not.toContain('Older');
    expect(html).not.toContain('page 1');
  });

  it('links to the older page with the cursor, keeping the filters', () => {
    search = 'status=blocked';
    const html = render({ status: 'blocked', nextCursor: '2026-09-10 12:00:00+00|pay_2' });
    expect(html).toContain(
      'href="/payments?status=blocked&amp;cursor=2026-09-10+12%3A00%3A00%2B00%7Cpay_2&amp;page=2"',
    );
    search = '';
  });

  it('offers the way back to the newest page, and says when the record ends', () => {
    search = 'cursor=x&page=2';
    const html = render({ page: 2 });
    expect(html).toContain('href="/payments"');
    expect(text(html)).toContain('Start of the record');
    search = '';
  });

  it('says when filters, not the record, are why nothing shows', () => {
    expect(text(render({ payments: [], agentId: 'agent_1' }))).toContain(
      'No payments match these filters',
    );
    expect(text(render({ payments: [] }))).toContain('No payments yet');
  });
});

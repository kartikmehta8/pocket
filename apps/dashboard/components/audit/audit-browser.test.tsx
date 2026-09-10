import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import type { AuditEvent } from '@/lib/types';

import { AuditBrowser, type AuditBrowserProps } from './audit-browser';

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

function event(overrides: Partial<AuditEvent>): AuditEvent {
  return {
    id: 'evt_1',
    actorType: 'agent',
    actorId: 'agent_1',
    action: 'payment.settled',
    subjectType: 'payment',
    subjectId: 'pay_1',
    payload: { amount: '0.08' },
    createdAt: '2026-09-10T12:00:00.000Z',
    ...overrides,
  };
}

const EVENTS = [
  event({ id: 'evt_1' }),
  event({ id: 'evt_2', action: 'payment.rejected', actorType: 'system', actorId: null }),
  event({ id: 'evt_3', action: 'org.created', subjectType: 'org', subjectId: null, payload: {} }),
];

// The actor badges carry hints, which need the provider the app layout supplies.
const render = (props: Partial<Omit<AuditBrowserProps, 'agents'>> = {}) =>
  renderToStaticMarkup(
    <TooltipProvider>
      <AuditBrowser
        events={EVENTS}
        action=""
        actorType=""
        nextCursor={null}
        page={1}
        {...props}
        agents={{ agent_1: 'Hermes' }}
      />
    </TooltipProvider>,
  );

describe('AuditBrowser', () => {
  it('lists every event and marks refusals so they can be found by eye', () => {
    const html = render();
    expect(text(html)).toContain('payment.settled');
    expect(text(html)).toContain('payment.rejected');
    expect(html).toContain('bg-danger-soft/50');
  });

  it('names the agent and links to it, and says what happened in words', () => {
    const html = render();
    expect(html).toContain('href="/agents/agent_1"');
    expect(text(html)).toContain('Hermes');
    expect(text(html)).toContain('0.08');
    expect(text(html)).not.toContain('Subject');
  });

  it('cannot expand an event with nothing behind it', () => {
    const html = render();
    expect(html).toMatch(/disabled=""[^>]*aria-label="Show payload for org\.created"/);
  });

  it('shows no paging on a single page', () => {
    const html = text(render());
    expect(html).not.toContain('Older');
    expect(html).not.toContain('Newest');
    expect(html).not.toContain('page 1');
  });

  it('links to the older page with the cursor, keeping the filters', () => {
    search = 'action=payment';
    const html = render({ action: 'payment', nextCursor: '41' });
    expect(html).toContain('href="/audit?action=payment&amp;cursor=41&amp;page=2"');
    expect(text(html)).not.toContain('Newest');
    search = '';
  });

  it('offers the way back to the newest page, and says when the record ends', () => {
    search = 'cursor=41&page=2';
    const html = render({ page: 2 });
    expect(html).toContain('href="/audit"');
    expect(text(html)).toContain('Start of the record');
    expect(text(html)).toContain('page 2');
    search = '';
  });

  it('says when filters, not the record, are why nothing shows', () => {
    expect(text(render({ events: [], action: 'wallet' }))).toContain(
      'No events match these filters',
    );
    expect(text(render({ events: [] }))).toContain('No audit events');
  });
});

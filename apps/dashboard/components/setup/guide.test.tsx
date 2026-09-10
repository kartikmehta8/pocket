import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { Guide } from './guide';
import type { AgentSummary } from '@/lib/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

/** The agent the guide follows. Only the fields the tree reads matter. */
const AGENT: AgentSummary = {
  id: 'agent_1',
  // Not 'Hermes': that is the register form's placeholder, and the point of
  // one assertion below is that the previous agent leaves no trace.
  name: 'Zephyr',
  description: null,
  status: 'active',
  createdAt: '2026-09-10T12:00:00.000Z',
  wallet: { address: '0xabc', chain: 'hedera-testnet' },
  budget: null,
  spend: { today: '0', dailyRemaining: '0', paymentCount: 0 },
};

/** Renders the guide for a given completion pattern and strips its tags. */
function render(derived: boolean[], agent: AgentSummary | null = AGENT): string {
  return renderToStaticMarkup(
    <Guide
      derived={derived}
      restarted={agent === null}
      agent={agent}
      detail={null}
      keysAvailable
      liveKeys={1}
      mcpUrl="http://localhost:8081/mcp"
      resource="http://localhost:8402"
      docsUrl="http://localhost:3001/docs"
    />,
  )
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ');
}

const NONE = [false, false, false, false, false];
/** Every recorded step done. The last two still need confirming. */
const ALL = [true, true, true, true, true];
const PART = [true, true, true, false, false];

describe('Guide', () => {
  it('renders every step, numbered out of the total', () => {
    const html = render(NONE);
    expect(html).toContain('Step 1 of 7');
    expect(html).toContain('Step 7 of 7');
  });

  it('points at the first outstanding step, and leaves the rest not started', () => {
    // PART finishes three, so step four is current and steps five to seven
    // are todo — the only state that carries the spoken "Not started".
    expect(render(PART).match(/Not started/g)).toHaveLength(3);
  });

  it('counts what live state says is behind the operator', () => {
    expect(render(PART)).toContain('3 of 7 done');
  });

  describe('the last two steps', () => {
    it('are not ticked by the five recorded ones', () => {
      // Every record the server can read says done, and the guide still waits
      // to be told about the terminal.
      const html = render(ALL);
      expect(html).toContain('5 of 7 done');
      expect(html).not.toContain('That is the whole flow');
    });

    it('each offer a way to say it is done', () => {
      expect(render(ALL).match(/I have done this/g)).toHaveLength(2);
    });

    it('promise nothing about checking a payment', () => {
      const html = render(ALL);
      expect(html).not.toContain('Ticks once a payment has settled');
      expect(html).toContain('Finishes the guide');
    });
  });

  describe('the restart control', () => {
    it.each([
      ['nothing done', NONE],
      ['part way', PART],
      ['every record done', ALL],
    ])('is offered %s', (_when, at) => {
      expect(render(at)).toContain('Restart guide');
    });

    it('is offered on a restarted run too', () => {
      expect(render(NONE, null)).toContain('Restart guide');
    });
  });

  describe('a restarted run', () => {
    // A restart hands the guide no agent at all, which is exactly what a new
    // organization looks like. Step one must therefore offer the register
    // form again — without it there is no way to name the next agent, and
    // "start again" leaves the reader with nothing to press.
    const fresh = render(NONE, null);

    it('offers the register form, so a new agent can be named', () => {
      expect(fresh).toContain('Agent name');
      expect(fresh).toContain('Create agent');
    });

    it('shows no trace of the previous agent', () => {
      expect(fresh).not.toContain(AGENT.name);
      expect(fresh).not.toContain(AGENT.id);
    });

    it('leaves every step outstanding', () => {
      expect(fresh).toContain('Start here');
      expect(fresh).toContain('exactly as it looks the first time');
      expect(fresh).not.toContain('done,');
    });

    it('is what a first-time organization sees, to the character', () => {
      expect(render(NONE, null)).toBe(fresh);
    });
  });
});

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { ConfigureStep } from './configure-step';

// The re-read button is a client component that reaches for the app router,
// which does not exist outside Next. Only its presence is under test here.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

/** Strips tags so an anchor's visible text can be matched. */
function text(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

describe('ConfigureStep', () => {
  const render = (agentId: string | null, done = false) =>
    renderToStaticMarkup(
      <ConfigureStep agentId={agentId} agentName="Hermes" kind="budget" done={done} />,
    );

  it('opens the agent in a new tab, and says so for a screen reader', () => {
    const html = render('agent_1');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer noopener"');
    expect(text(html)).toContain('(opens in a new tab)');
  });

  it('offers a re-read, because the new tab leaves this one stale', () => {
    expect(text(render('agent_1'))).toContain('I have done this');
  });

  it('drops the re-check once the rules are saved, rather than nagging forever', () => {
    const html = text(render('agent_1', true));
    expect(html).not.toContain('I have done this');
    expect(html).toContain('Set a budget for');
  });

  it('offers neither before an agent exists', () => {
    const html = render(null);
    expect(html).not.toContain('target="_blank"');
    expect(text(html)).toContain('Register an agent in step one');
  });
});

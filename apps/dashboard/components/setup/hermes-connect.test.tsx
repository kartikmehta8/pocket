/**
 * The connection recipes, one tab per agent runtime.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

import { HermesConnect } from './hermes-connect';

/** Strips tags so visible text can be matched. */
function text(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

const render = (props: Partial<Parameters<typeof HermesConnect>[0]> = {}) =>
  renderToStaticMarkup(
    <TooltipProvider>
      <HermesConnect
        url="https://api.pocketapp.xyz/mcp"
        apiKey={null}
        ready
        done={false}
        onDone={() => undefined}
        {...props}
      />
    </TooltipProvider>,
  );

describe('HermesConnect', () => {
  it('fills a freshly created key straight into the command', () => {
    const html = render({ apiKey: 'pocket_sk_live_example' });
    expect(text(html)).toContain('Bearer pocket_sk_live_example');
    expect(text(html)).toContain('already in the command');
    expect(html).not.toContain('<input');
  });

  it('offers no box to paste into, and says why the placeholder is there', () => {
    const html = render();
    expect(html).not.toContain('<input');
    expect(text(html)).toContain('Bearer pocket_sk_...');
    expect(text(html)).toContain('cannot show it again');
  });

  it('cannot be confirmed until the key step is done', () => {
    expect(render({ ready: false })).toMatch(/<button[^>]*disabled=""/);
    expect(text(render({ ready: false }))).toContain('Unlocks once step five is done');
    expect(render({ ready: true })).not.toMatch(/<button[^>]*disabled=""/);
  });
});

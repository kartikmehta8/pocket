/**
 * One step of the setup guide. lucide renders the glyph name into a class,
 * which is how the check is told apart from the step’s own icon without
 * matching path data. "Complete" then "Done" for one step is a stutter, not
 * redundancy the way a glyph beside a label is. The marker is `size-7`
 * (1.75rem), so its centre is 0.875rem and a 1px rule sits there exactly:
 * changing either number without the other leaves a visibly bent spine.
 */

import { Bot } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Step, type StepState } from './step';

/** Renders one step and hands back its markup. */
function render(state: StepState, last = false): string {
  return renderToStaticMarkup(
    <Step
      index={2}
      total={7}
      icon={Bot}
      title="Fund its wallet"
      summary="A summary."
      state={state}
      last={last}
    >
      <p>Body</p>
    </Step>,
  );
}

describe('Step', () => {
  it('numbers itself out of the total', () => {
    expect(render('todo')).toContain('Step 2 of 7');
  });

  it('renders its children', () => {
    expect(render('current')).toContain('<p>Body</p>');
  });

  describe('state is never carried by colour alone', () => {
    it('marks a finished step with a check and a written pill', () => {
      const html = render('done');
      expect(html).toContain('lucide-check');
      expect(html).toContain('Done');
    });

    it('marks the outstanding step with its icon and a written pill', () => {
      const html = render('current');
      expect(html).toContain('lucide-bot');
      expect(html).not.toContain('lucide-check');
      expect(html).toContain('Do this next');
    });

    it('leaves a later step unpilled but still announced', () => {
      const html = render('todo');
      expect(html).toContain('lucide-bot');
      expect(html).toContain('Not started');
      expect(html).not.toContain('Do this next');
      expect(html).not.toContain('>Done<');
    });

    it('does not say aloud what the pill already says', () => {
      expect(render('done')).not.toContain('Not started');
      expect(render('current')).not.toContain('Not started');
    });
  });

  describe('the finished marker', () => {
    it('is a tinted disc, not a filled green block', () => {
      const html = render('done');
      expect(html).toContain('bg-success-soft');
      expect(html).toContain('text-success-ink');
      expect(html).not.toMatch(/\bbg-success\b(?!-)/);
      expect(html).not.toContain('text-white');
    });
  });

  describe('the connector', () => {
    it('runs down from every step but the last', () => {
      expect(render('done')).toContain('left-[0.875rem]');
      expect(render('done', true)).not.toContain('left-[0.875rem]');
    });

    it('is solid behind a finished step and dashed behind the rest', () => {
      expect(render('done')).not.toContain('border-dashed');
      expect(render('current')).toContain('border-dashed');
      expect(render('todo')).toContain('border-dashed');
    });

    it('sits on the marker’s centre line', () => {
      const html = render('todo');
      expect(html).toContain('size-7');
      expect(html).toContain('left-[0.875rem]');
    });

    it('is a hairline, the same weight as every other rule in the theme', () => {
      expect(render('todo')).not.toContain('border-l-2');
    });
  });
});

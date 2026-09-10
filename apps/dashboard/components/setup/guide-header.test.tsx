import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GuideHeader } from './guide-header';

/** Renders the header and strips tags so its copy can be matched. */
function render(done: number, restarted = false): string {
  return renderToStaticMarkup(
    <GuideHeader
      done={done}
      total={7}
      restarted={restarted}
      pending={false}
      onRestart={() => undefined}
    />,
  )
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ');
}

describe('GuideHeader', () => {
  it('names each stage of a run', () => {
    expect(render(0)).toContain('Start here');
    expect(render(3)).toContain('Your progress');
    expect(render(7)).toContain('Everything is connected');
  });

  it('counts what is done mid-run', () => {
    expect(render(3)).toContain('3 of 7 done');
  });

  describe('the restart control', () => {
    it.each([0, 3, 7])('is offered at every point in the run (%i done)', (done) => {
      // Somebody who wants to start over halfway through wants it more than
      // somebody who has just finished.
      expect(render(done)).toContain('Restart guide');
    });

    it('is still offered on a run that has just been restarted', () => {
      expect(render(0, true)).toContain('Restart guide');
    });

    it('reads exactly like a first run, because that is what it is', () => {
      expect(render(0, true)).toContain('Start here');
      expect(render(0, true)).toContain('exactly as it looks the first time');
    });

    it('says nothing was deleted, because nothing was', () => {
      expect(render(0, true)).toContain('Nothing was deleted');
    });
  });
});

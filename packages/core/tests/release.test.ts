import { afterEach, describe, expect, it, vi } from 'vitest';

import { release } from '../src/release.js';

/**
 * Every service answers its home route with this, and the field anyone
 * actually reads off it is which build is running. Getting that wrong is worse
 * than omitting it: a status page confidently naming the previous release is
 * how an incident gets diagnosed against the wrong code.
 */
const VARIABLES = [
  'GIT_COMMIT',
  'VERCEL_GIT_COMMIT_SHA',
  'SOURCE_COMMIT',
  'BUILD_TIME',
  'NODE_ENV',
] as const;

/**
 * Sets the environment for one case, leaving every other variable unset.
 *
 * @param values - The variables this case is about.
 */
function withEnv(values: Partial<Record<(typeof VARIABLES)[number], string>>): void {
  for (const name of VARIABLES) {
    vi.stubEnv(name, values[name]);
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('release', () => {
  it('prefers the commit this repository stamps over a platform variable', () => {
    withEnv({ GIT_COMMIT: 'e4d3ef6', VERCEL_GIT_COMMIT_SHA: 'wrong', SOURCE_COMMIT: 'also-wrong' });
    expect(release('0.1.0').commit).toBe('e4d3ef6');
  });

  it('falls back through the platform variables in order', () => {
    withEnv({ VERCEL_GIT_COMMIT_SHA: 'from-vercel', SOURCE_COMMIT: 'from-docker' });
    expect(release('0.1.0').commit).toBe('from-vercel');

    withEnv({ SOURCE_COMMIT: 'from-docker' });
    expect(release('0.1.0').commit).toBe('from-docker');
  });

  it('reports no commit rather than an empty one when nothing stamped it', () => {
    withEnv({ GIT_COMMIT: '   ' });
    const info = release('0.1.0');
    expect(info.commit).toBeNull();
    expect(info.builtAt).toBeNull();
  });

  it('assumes development when the environment does not say', () => {
    withEnv({});
    expect(release('0.1.0').environment).toBe('development');
  });

  it('reports a start time consistent with the uptime it reports', () => {
    withEnv({});
    const info = release('0.1.0');
    const elapsed = (Date.now() - Date.parse(info.startedAt)) / 1000;
    // The two come from one reading of the clock, so they can only differ by
    // the flooring of the seconds.
    expect(elapsed - info.uptimeSeconds).toBeLessThan(1.5);
    expect(elapsed).toBeGreaterThanOrEqual(info.uptimeSeconds);
  });
});

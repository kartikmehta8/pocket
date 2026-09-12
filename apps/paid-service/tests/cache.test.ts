/**
 * Warming and refreshing the feeds this seller offers.
 */

import { describe, expect, it, vi } from 'vitest';

import { SourceCache } from '../src/cache.js';
import type { DataSource } from '../src/sources/types.js';

/** A feed that fails a set number of times before it starts working. */
function flaky(id: string, failures: number): DataSource {
  let seen = 0;
  return {
    id,
    path: `/v1/${id}`,
    title: id,
    description: id,
    useCase: id,
    provider: 'test',
    price: '0.01',
    ttlMs: 60_000,
    load: () => {
      seen += 1;
      if (seen <= failures) return Promise.reject(new Error(`${id} is down`));
      return Promise.resolve({ id, seen });
    },
  } as DataSource;
}

/** Errors are reported, never thrown, so warming keeps going. */
const quiet = () => undefined;

describe('SourceCache.warm', () => {
  it('serves a feed whose upstream failed the first time', async () => {
    const cache = new SourceCache(quiet);
    const source = flaky('slow', 1);

    const warmed = await cache.warm([[source]], { attempts: 3, retryDelayMs: 0 });

    expect(warmed.map((entry) => entry.id)).toEqual(['slow']);
    expect(cache.snapshot('slow')).not.toBeNull();
  });

  it('gives up on one that never answers, without taking the others with it', async () => {
    const cache = new SourceCache(quiet);
    const sources = [flaky('good', 0), flaky('dead', 99)];

    const warmed = await cache.warm([sources], { attempts: 2, retryDelayMs: 0 });

    expect(warmed.map((entry) => entry.id)).toEqual(['good']);
    expect(cache.snapshot('dead')).toBeNull();
  });

  it('keeps declaration order when the first feed needs a second attempt', async () => {
    const cache = new SourceCache(quiet);
    const sources = [flaky('first', 1), flaky('second', 0)];

    const warmed = await cache.warm([sources], { attempts: 3, retryDelayMs: 0 });

    expect(warmed.map((entry) => entry.id)).toEqual(['first', 'second']);
  });

  it('warms a stage at a time, so a composed feed sees its inputs', async () => {
    const cache = new SourceCache(quiet);
    const raw = flaky('raw', 1);
    const composed: DataSource = {
      ...flaky('composed', 0),
      id: 'composed',
      load: () => {
        if (cache.snapshot('raw') === null) throw new Error('raw is missing');
        return Promise.resolve({ ok: true });
      },
    };

    const warmed = await cache.warm([[raw], [composed]], { attempts: 3, retryDelayMs: 0 });

    expect(warmed.map((entry) => entry.id)).toEqual(['raw', 'composed']);
  });
});

describe('background refresh', () => {
  it('replaces a snapshot on each tick and stops when told to', async () => {
    vi.useFakeTimers();
    try {
      const cache = new SourceCache(quiet);
      let loads = 0;
      const source: DataSource = {
        id: 'ticking',
        path: '/v1/ticking',
        title: 'Ticking',
        description: 'A feed that counts.',
        useCase: 'Counting.',
        provider: 'test',
        price: '0.01',
        ttlMs: 1000,
        load: () => Promise.resolve({ n: ++loads }),
      };

      cache.start(await cache.warm([[source]], { attempts: 1, retryDelayMs: 0 }));
      expect(cache.snapshot('ticking')?.data).toEqual({ n: 1 });

      await vi.advanceTimersByTimeAsync(1000);
      expect(cache.snapshot('ticking')?.data).toEqual({ n: 2 });

      cache.stop();
      await vi.advanceTimersByTimeAsync(5000);
      expect(cache.snapshot('ticking')?.data).toEqual({ n: 2 });
    } finally {
      vi.useRealTimers();
    }
  });

  it('serves the last good data and says it is stale when a refresh fails', async () => {
    vi.useFakeTimers();
    try {
      const errors: string[] = [];
      const cache = new SourceCache((id) => errors.push(id));
      let calls = 0;
      const source: DataSource = {
        id: 'flapping',
        path: '/v1/flapping',
        title: 'Flapping',
        description: 'A feed whose upstream comes and goes.',
        useCase: 'Testing.',
        provider: 'test',
        price: '0.01',
        ttlMs: 1000,
        load: () => {
          calls += 1;
          return calls === 1 ? Promise.resolve({ ok: true }) : Promise.reject(new Error('down'));
        },
      };

      cache.start(await cache.warm([[source]], { attempts: 1, retryDelayMs: 0 }));
      expect(cache.snapshot('flapping')?.stale).toBe(false);

      await vi.advanceTimersByTimeAsync(1000);
      expect(cache.snapshot('flapping')?.data).toEqual({ ok: true });
      expect(cache.snapshot('flapping')?.stale).toBe(true);
      expect(errors).toContain('flapping');

      cache.stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it('answers null for a feed it has never loaded', () => {
    expect(new SourceCache(quiet).snapshot('never-warmed')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

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

  it('keeps declaration order, not the order they happened to succeed in', async () => {
    const cache = new SourceCache(quiet);
    // The first feed needs two attempts, so it finishes after the second one.
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
        // The real composed feeds throw when an input never warmed.
        if (cache.snapshot('raw') === null) throw new Error('raw is missing');
        return Promise.resolve({ ok: true });
      },
    };

    const warmed = await cache.warm([[raw], [composed]], { attempts: 3, retryDelayMs: 0 });

    expect(warmed.map((entry) => entry.id)).toEqual(['raw', 'composed']);
  });
});

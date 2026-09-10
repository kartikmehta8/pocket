import { describe, expect, it } from 'vitest';

import { readRestartAt, restartInEffect } from './setup-restart';

/** Fixed instants, so nothing here depends on when the suite runs. */
const NOW = Date.parse('2026-09-10T12:00:00.000Z');
const BEFORE = '2026-09-10T11:00:00.000Z';
const AFTER = '2026-09-10T13:00:00.000Z';

describe('readRestartAt', () => {
  it('reads an instant the button wrote', () => {
    expect(readRestartAt(String(NOW - 1000), NOW)).toBe(NOW - 1000);
  });

  it('reads a missing cookie as no restart', () => {
    expect(readRestartAt(undefined, NOW)).toBeNull();
  });

  it('refuses an instant in the future, which would hide every future agent', () => {
    expect(readRestartAt(String(NOW + 1000), NOW)).toBeNull();
  });

  it.each(['', '1', 'now', '-5', '12.5', '1e9', ' 123'])('refuses %o', (raw) => {
    expect(readRestartAt(raw, NOW)).toBeNull();
  });
});

describe('restartInEffect', () => {
  it('is not in effect without a restart', () => {
    expect(restartInEffect(null, BEFORE)).toBe(false);
    expect(restartInEffect(null, null)).toBe(false);
  });

  it('holds for an organization that has no agent yet', () => {
    expect(restartInEffect(NOW, null)).toBe(true);
  });

  it('holds while every agent predates it', () => {
    expect(restartInEffect(NOW, BEFORE)).toBe(true);
  });

  it('survives a reload, because it is decided from the cookie every time', () => {
    // Nothing here is remembered between calls; the same two inputs give the
    // same answer on the tenth render as on the first.
    const answers = Array.from({ length: 10 }, () => restartInEffect(NOW, BEFORE));
    expect(answers.every(Boolean)).toBe(true);
  });

  it('is spent the moment an agent is registered after it', () => {
    expect(restartInEffect(NOW, AFTER)).toBe(false);
  });

  it('holds when the newest agent has an unreadable registration date', () => {
    // Better to show a fresh run the operator can act on than to silently
    // ignore a restart they just asked for.
    expect(restartInEffect(NOW, 'not a date')).toBe(true);
  });
});

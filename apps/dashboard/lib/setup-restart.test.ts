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

  it('clamps a browser clock running fast, rather than refusing the restart', () => {
    // The browser stamps this and the server reads it. Refusing a skewed
    // instant made the button do nothing at all, with no error to see.
    expect(readRestartAt(String(NOW + 60_000), NOW)).toBe(NOW);
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

  it('round-trips what the button writes', () => {
    // The browser builds the cookie value and the server parses it. Nothing
    // else ties the two halves together, so a format change would otherwise
    // break the restart with every check still green.
    const written = String(NOW);
    expect(restartInEffect(readRestartAt(written, NOW), BEFORE)).toBe(true);
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

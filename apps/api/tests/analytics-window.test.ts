/**
 * The daily series is grouped by UTC day, so its window has to be made of
 * whole UTC days. A window that starts at the current clock time reports a
 * half day as a full one and ends a day short of today.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { utcDayStart } from '../src/services/analytics.js';
import { createHarness, type Harness } from './helpers.js';

describe('utcDayStart', () => {
  it('rewinds to midnight of the day the instant falls in', () => {
    expect(utcDayStart(new Date('2026-09-11T18:42:31.500Z')).toISOString()).toBe(
      '2026-09-11T00:00:00.000Z',
    );
  });

  it('counts whole days back, so seven days ends on the seventh', () => {
    const from = utcDayStart(new Date('2026-09-11T18:42:00Z'), 6);
    expect(from.toISOString()).toBe('2026-09-05T00:00:00.000Z');
  });

  it('crosses month and year boundaries', () => {
    expect(utcDayStart(new Date('2026-03-02T00:30:00Z'), 6).toISOString()).toBe(
      '2026-02-24T00:00:00.000Z',
    );
    expect(utcDayStart(new Date('2026-01-03T23:59:59Z'), 6).toISOString()).toBe(
      '2025-12-28T00:00:00.000Z',
    );
  });
});

describe('GET /v1/analytics/timeseries', () => {
  let h: Harness;

  beforeAll(async () => {
    h = await createHarness();
  });

  afterAll(async () => {
    await h.app.close();
  });

  it('returns one point per day, the last of which is today', async () => {
    const response = await h.app.inject({
      method: 'GET',
      url: '/v1/analytics/timeseries?days=7',
      headers: h.auth,
    });
    expect(response.statusCode).toBe(200);

    const points = response.json().points as Array<{ date: string }>;
    expect(points).toHaveLength(7);
    expect(points[6]?.date).toBe(new Date().toISOString().slice(0, 10));
    expect(points[0]?.date).toBe(utcDayStart(new Date(), 6).toISOString().slice(0, 10));

    // Dense and in order: every gap is exactly one day, so a chart cannot
    // close a quiet day by joining the two either side of it.
    const spacing = points
      .slice(1)
      .map((point, index) => Date.parse(point.date) - Date.parse(points[index]?.date ?? ''));
    expect(new Set(spacing)).toEqual(new Set([86_400_000]));
  });
});

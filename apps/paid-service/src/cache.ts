/**
 * Snapshot cache for the upstream feeds.
 *
 * This exists because of an ordering problem the x402 middleware creates: the
 * facilitator settles the payment *before* the route handler runs. If a
 * handler then went to an upstream API and that upstream was down, the buyer
 * would have paid for an error.
 *
 * So no handler ever calls an upstream. Every feed is warmed before the server
 * accepts traffic, refreshed on a timer behind the scenes, and served from
 * memory. A feed that fails to warm is left out of the catalog entirely, which
 * means it never advertises a price and never takes money it cannot honour.
 * A feed that fails to *refresh* keeps serving its last good snapshot with an
 * honest `asOf`, which is what every commercial data API does.
 */

import { setTimeout as sleep } from 'node:timers/promises';

import type { DataSource } from './sources/types.js';

/** A cached payload and when it was fetched. */
export interface Snapshot {
  data: unknown;
  asOf: Date;
  /** True when the last refresh failed and this is the previous snapshot. */
  stale: boolean;
}

/** Warms, holds and refreshes every feed. */
export class SourceCache {
  readonly #snapshots = new Map<string, Snapshot>();
  readonly #timers: NodeJS.Timeout[] = [];
  readonly #onError: (source: string, error: unknown) => void;

  /**
   * @param onError - Called when a refresh fails, so failures reach the log
   *   instead of being swallowed by the timer.
   * @remarks The cache is constructed before the feeds are, because the
   *   composed research feeds read from it. Passing them to
   *   {@link SourceCache.warm} instead of the constructor keeps that
   *   dependency one-directional.
   */
  public constructor(onError: (source: string, error: unknown) => void) {
    this.#onError = onError;
  }

  /**
   * Loads every feed, one stage at a time, before anything is offered for sale.
   *
   * @param stages - Feeds in dependency order. A composed feed reads the raw
   *   snapshots, so it cannot be warmed in the same stage as its inputs.
   * @param options - How many times to try each feed, and how long to wait
   *   between attempts.
   * @returns The feeds that loaded, in declaration order.
   * @remarks Never rejects: one dead upstream must not stop the seller from
   *   offering the feeds that do work.
   *
   *   Retried rather than attempted once. A feed that fails here is not
   *   registered for sale at all, and routes are fixed when the port binds, so
   *   one slow upstream at the wrong moment used to cost that feed for the
   *   lifetime of the process — and every composed feed that reads it with it.
   *
   *   The result is in declaration order rather than the order the feeds
   *   happened to succeed in. The catalogue is read by people, and a feed
   *   should not move because its upstream was slow the first time.
   */
  public async warm(
    stages: ReadonlyArray<readonly DataSource[]>,
    options: { attempts?: number; retryDelayMs?: number } = {},
  ): Promise<DataSource[]> {
    const attempts = Math.max(1, options.attempts ?? 3);
    const retryDelayMs = options.retryDelayMs ?? 2_000;
    const warmed = new Set<string>();

    for (const stage of stages) {
      let pending = [...stage];
      for (let attempt = 1; attempt <= attempts && pending.length > 0; attempt += 1) {
        if (attempt > 1) await sleep(retryDelayMs);
        const results = await Promise.all(
          pending.map(async (source) => ({ source, ok: await this.#refresh(source) })),
        );
        for (const { source, ok } of results) if (ok) warmed.add(source.id);
        pending = results.filter(({ ok }) => !ok).map(({ source }) => source);
      }
    }

    return stages.flat().filter((source) => warmed.has(source.id));
  }

  /**
   * Starts background refresh for the given feeds.
   *
   * @param sources - The feeds that warmed successfully.
   * @remarks Every timer is unreferenced, so a refresh schedule never holds the
   *   process open.
   */
  public start(sources: readonly DataSource[]): void {
    for (const source of sources) {
      const timer = setInterval(() => void this.#refresh(source), source.ttlMs);
      timer.unref();
      this.#timers.push(timer);
    }
  }

  /** Stops every refresh timer. */
  public stop(): void {
    for (const timer of this.#timers) clearInterval(timer);
    this.#timers.length = 0;
  }

  /**
   * Reads a feed's current snapshot.
   *
   * @param id - Source identifier.
   * @returns The snapshot, or `null` when the feed has never loaded.
   */
  public snapshot(id: string): Snapshot | null {
    return this.#snapshots.get(id) ?? null;
  }

  /**
   * Fetches one feed and stores the result.
   *
   * @param source - The feed to refresh.
   * @returns Whether a usable snapshot now exists.
   */
  async #refresh(source: DataSource): Promise<boolean> {
    try {
      const data = await source.load();
      this.#snapshots.set(source.id, { data, asOf: new Date(), stale: false });
      return true;
    } catch (cause) {
      this.#onError(source.id, cause);
      const previous = this.#snapshots.get(source.id);
      if (previous === undefined) return false;
      this.#snapshots.set(source.id, { ...previous, stale: true });
      return true;
    }
  }
}

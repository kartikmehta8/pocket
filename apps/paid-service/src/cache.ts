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
   * Fetches feeds once, in the order given.
   *
   * @param stages - Groups of feeds. Each group is fetched in parallel, and
   *   groups run in sequence, so a composed feed can be warmed after the raw
   *   feeds it reads.
   * @returns The sources that loaded. Only these may be sold.
   * @remarks Never rejects: one dead upstream must not stop the seller from
   *   offering the feeds that do work.
   */
  public async warm(stages: ReadonlyArray<readonly DataSource[]>): Promise<DataSource[]> {
    const loaded: DataSource[] = [];
    for (const stage of stages) {
      const results = await Promise.all(
        stage.map(async (source) => ((await this.#refresh(source)) ? source : null)),
      );
      loaded.push(...results.filter((source): source is DataSource => source !== null));
    }
    return loaded;
  }

  /**
   * Starts background refresh for the given feeds.
   *
   * @param sources - The feeds that warmed successfully.
   */
  public start(sources: readonly DataSource[]): void {
    for (const source of sources) {
      const timer = setInterval(() => void this.#refresh(source), source.ttlMs);
      // Never hold the process open for a refresh timer.
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
      // Keep serving the last good data, but say that is what it is.
      this.#snapshots.set(source.id, { ...previous, stale: true });
      return true;
    }
  }
}

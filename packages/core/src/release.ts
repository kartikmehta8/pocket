/**
 * What is running, and since when.
 *
 * Each service answers its own home route with a description of itself, and
 * the first thing anyone asks of a running service — an operator, a reviewer,
 * whoever is looking at an incident — is which build this is and how long it
 * has been up. That answer is identical in shape for all three services, so it
 * is written once.
 *
 * Not exported from the package index, which promises pure values: this reads
 * the environment and the process clock.
 */

/** The build a service is running, and how long it has been running it. */
export interface Release {
  /** Package version of the service. */
  version: string;
  /** Commit the build came from, or `null` when nothing recorded one. */
  commit: string | null;
  /** When the build was produced, ISO 8601, or `null` when unrecorded. */
  builtAt: string | null;
  /** When this process started, ISO 8601. */
  startedAt: string;
  /** How long it has been running, whole seconds. */
  uptimeSeconds: number;
  /** `production`, `development`, or whatever `NODE_ENV` says. */
  environment: string;
}

/**
 * The first of these that is set wins.
 *
 * @remarks Three spellings because three platforms write it: `GIT_COMMIT` is
 * what this repository's own scripts and Dockerfiles set, and the other two
 * are injected by Vercel and by Docker Hub's automated builds. A service
 * should be able to say which build it is wherever it happens to be running.
 */
const COMMIT_VARIABLES = ['GIT_COMMIT', 'VERCEL_GIT_COMMIT_SHA', 'SOURCE_COMMIT'] as const;

/**
 * Reads a variable, treating a blank one as unset.
 *
 * @param name - Variable to read.
 * @returns Its trimmed value, or `null`.
 */
function env(name: string): string | null {
  const value = (process.env[name] ?? '').trim();
  return value === '' ? null : value;
}

/**
 * Describes the running build.
 *
 * @param version - The service's package version.
 * @returns Build identity and uptime, safe to serve publicly.
 * @remarks `startedAt` is derived from the process clock rather than captured
 * when this module loads, so it is the moment the runtime started and not the
 * moment the first import happened to run.
 */
export function release(version: string): Release {
  // One reading of the clock, used twice. Two calls would let the reported
  // start time and uptime disagree by however long the object took to build.
  const uptime = process.uptime();
  return {
    version,
    commit: COMMIT_VARIABLES.map(env).find((value) => value !== null) ?? null,
    builtAt: env('BUILD_TIME'),
    startedAt: new Date(Date.now() - uptime * 1000).toISOString(),
    uptimeSeconds: Math.floor(uptime),
    environment: env('NODE_ENV') ?? 'development',
  };
}

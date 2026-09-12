/**
 * Loading the repository's `.env` in development.
 *
 * `tsx` does not read `.env`, so a service started with `pnpm dev` sees only
 * whatever the shell that launched it happened to export. That makes
 * configuration depend on how long ago a terminal was opened: add a variable
 * to `.env`, and every already-running service keeps the environment it
 * started with and silently behaves as though the setting does not exist.
 *
 * In production the environment is injected by the container and no file is
 * present, which is why a missing one is not an error.
 *
 * Exported from `@pocket/core/env` rather than the package root: it reaches
 * for `node:fs`, and the dashboard pulls the root into a browser bundle.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Where the shared `.env` sits, relative to a service's working directory. */
const ENV_FILE = resolve(process.cwd(), '../../.env');

/**
 * Loads `.env` into `process.env`, if there is one.
 *
 * @remarks Values already set take precedence, so an explicit
 * `FOO=bar pnpm dev` still wins and the file cannot override a deliberate
 * override. Call before reading any configuration.
 */
export function loadEnvFile(): void {
  if (!existsSync(ENV_FILE)) return;
  process.loadEnvFile(ENV_FILE);
}

/**
 * Drops variables that are present but empty.
 *
 * Half of a `.env` is meant to be left blank: a blank vendor key is how an
 * adapter is told to fall back. Zod reads `FOO=` as the string `""`, which
 * satisfies no enum, no URL and no positive number, so a blank would refuse to
 * boot rather than take its default. Treating empty as absent is what an
 * operator means by it.
 *
 * @param env - Raw environment.
 * @returns The same environment without its empty values.
 */
export function withoutBlanks(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined && value.trim() !== ''),
  );
}

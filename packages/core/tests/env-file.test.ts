/**
 * Loading the repository's `.env` in development.
 *
 * The rule that matters is precedence. An explicit `FOO=bar pnpm dev` has to
 * win over the file, or a deliberate override becomes a coin toss. A missing
 * file is not an error, because in production there is never one.
 *
 * The module resolves the path once, at import, so each case changes directory
 * and then imports it fresh rather than reusing a binding that already decided
 * where to look.
 */

import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** Imports the loader after a directory change, so it resolves the right file. */
async function load(): Promise<void> {
  vi.resetModules();
  const { loadEnvFile } = await import('../src/env-file.js');
  loadEnvFile();
}

const cwd = process.cwd();
const made: string[] = [];

afterEach(() => {
  process.chdir(cwd);
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
  delete process.env['POCKET_ENV_FILE_FIXTURE'];
  delete process.env['POCKET_ENV_FILE_EXPLICIT'];
});

/** Builds a workspace whose `../../.env` is the file under test. */
function workspace(contents: string): string {
  const root = mkdtempSync(join(tmpdir(), 'pocket-env-'));
  made.push(root);
  mkdirSync(join(root, 'apps', 'service'), { recursive: true });
  writeFileSync(join(root, '.env'), contents);
  return join(root, 'apps', 'service');
}

describe('loadEnvFile', () => {
  it('loads a value the shell did not set', async () => {
    process.chdir(workspace('POCKET_ENV_FILE_FIXTURE=from-file\n'));
    await load();
    expect(process.env['POCKET_ENV_FILE_FIXTURE']).toBe('from-file');
  });

  it('leaves an explicit override alone', async () => {
    process.env['POCKET_ENV_FILE_EXPLICIT'] = 'from-shell';
    process.chdir(workspace('POCKET_ENV_FILE_EXPLICIT=from-file\n'));
    await load();
    expect(process.env['POCKET_ENV_FILE_EXPLICIT']).toBe('from-shell');
  });

  it('does nothing when there is no file, which is production', async () => {
    const root = mkdtempSync(join(tmpdir(), 'pocket-env-'));
    made.push(root);
    mkdirSync(join(root, 'apps', 'service'), { recursive: true });
    process.chdir(join(root, 'apps', 'service'));
    await expect(load()).resolves.toBeUndefined();
  });
});

/**
 * Process configuration.
 *
 * Every environment variable is validated once at startup, so a missing or
 * malformed value fails immediately and loudly rather than at the moment an
 * agent tries to spend money.
 */

import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required.'),
  /** Comma-separated origins permitted to call the API from a browser. */
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CHAIN: z.enum(['hedera-testnet', 'hedera-mainnet']).default('hedera-testnet'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  /** Mirror node used to resolve Hedera account ids and keys. */
  HEDERA_MIRROR_URL: z.string().url().default('https://testnet.mirrornode.hedera.com'),
  /**
   * Whether the purchase flow may fetch loopback and private addresses.
   *
   * @remarks The API fetches URLs its callers choose, which is the shape of a
   * server-side request forgery. Local development needs it on, because the
   * example seller runs on `localhost`. It defaults off in production, and
   * turning it on there is a deliberate act.
   */
  ALLOW_PRIVATE_RESOURCE_HOSTS: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

/** Validated configuration for this process. */
export type Config = z.infer<typeof schema> & { corsOrigins: string[] };

/**
 * Parses and validates process configuration.
 *
 * @param env - Raw environment, injected so tests can supply their own.
 * @returns Validated configuration.
 * @throws {Error} With a readable summary when validation fails. The message
 *   names the offending variables but never echoes their values, which would
 *   leak a secret into the logs.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = schema.safeParse(env);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid configuration. Check these variables: ${fields}`);
  }
  return {
    ...result.data,
    ALLOW_PRIVATE_RESOURCE_HOSTS:
      env['ALLOW_PRIVATE_RESOURCE_HOSTS'] === undefined
        ? result.data.NODE_ENV !== 'production'
        : result.data.ALLOW_PRIVATE_RESOURCE_HOSTS,
    corsOrigins: result.data.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin !== ''),
  };
}

/**
 * Process configuration.
 *
 * Every environment variable is validated once at startup, so a missing or
 * malformed value fails immediately and loudly rather than at the moment an
 * agent tries to spend money.
 */

import { z } from 'zod';

/** Decimal places of the asset agents are seeded with. */
const USDC_DECIMALS = 6;

/**
 * The most an agent may be seeded with, in whole USDC.
 *
 * @remarks A guard rail on a typo, not a policy. Seeding exists so an operator
 * can make a handful of calls that cost a hundredth each; nothing about the
 * demo needs more than this, and a misplaced key should not empty a treasury.
 */
const MAX_AGENT_SEED = 5;

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(8080),
    HOST: z.string().default('0.0.0.0'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required.'),
    /** Comma-separated origins permitted to call the API from a browser. */
    CORS_ORIGINS: z.string().default('http://localhost:3000'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
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
    /**
     * Privy wallet id of the account that seeds new agents.
     *
     * @remarks Optional. Without it a new agent is provisioned empty, which is
     * correct but leaves the operator at a faucet before they can do anything.
     */
    TREASURY_WALLET_ID: z.string().min(1).optional(),
    /** EVM address of {@link TREASURY_WALLET_ID}, which must be the same wallet. */
    TREASURY_ADDRESS: z
      .string()
      .regex(/^0x[0-9a-fA-F]{40}$/, 'Must be a 0x address.')
      .optional(),
    /**
     * How much USDC to send a newly provisioned agent, as a decimal string.
     *
     * @remarks Enough to prove the whole flow without being worth stealing: the
     * example resource costs 0.01, so the default buys two calls. Set it to `0`
     * to provision empty while leaving the treasury configured.
     *
     * Both bounds are enforced here rather than where the money moves. More
     * precision than USDC has would throw at the moment of the transfer, after
     * an agent has already been created and cannot be un-created; and an
     * unbounded figure turns one misplaced key into a drained treasury on the
     * very next registration. Configuration faults belong at boot.
     */
    AGENT_SEED_AMOUNT: z
      .string()
      .regex(/^\d+(\.\d+)?$/, 'Must be a decimal amount.')
      .refine(
        (value) => (value.split('.')[1] ?? '').length <= USDC_DECIMALS,
        `USDC has only ${USDC_DECIMALS} decimal places.`,
      )
      .refine(
        (value) => Number(value) <= MAX_AGENT_SEED,
        `Refusing to seed more than ${MAX_AGENT_SEED} USDC an agent.`,
      )
      .default('0.02'),
  })
  // Half a treasury pays nobody, and says nothing about why. Without this, a
  // typo in one of the two variables looks exactly like seeding switched off:
  // the operator is told their new agent "arrived empty" and has no way to
  // discover the real reason.
  .refine(
    (config) =>
      (config.TREASURY_WALLET_ID === undefined) === (config.TREASURY_ADDRESS === undefined),
    {
      message: 'Set both TREASURY_WALLET_ID and TREASURY_ADDRESS, or neither.',
      path: ['TREASURY_ADDRESS'],
    },
  );

/** Validated configuration for this process. */
export type Config = z.infer<typeof schema> & { corsOrigins: string[] };

/**
 * Drops variables that are present but empty.
 *
 * `.env` files are written by hand and half of this one is meant to be left
 * blank, because a blank vendor key is how an adapter is told to fall back.
 * Zod sees `FOO=` as the string `""`, which satisfies no enum, no URL and no
 * positive number, so a blank would refuse to boot rather than take its
 * default. Treating empty as absent is what an operator means by it.
 *
 * @param env - Raw environment.
 * @returns The same environment without its empty values.
 */
function withoutBlanks(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined && value.trim() !== ''),
  );
}

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
  const result = schema.safeParse(withoutBlanks(env));
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

/**
 * Seller configuration.
 *
 * Every value is read from the environment and validated once at startup. The
 * seller is an independent business, so it shares nothing with Purse but the
 * network it settles on.
 */

import { z } from 'zod';

const schema = z.object({
  PAID_SERVICE_PORT: z.coerce.number().int().positive().default(8402),
  /** EVM address the seller is paid at. Resolved to a Hedera account at boot. */
  PAID_SERVICE_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Must be a 0x address.'),
  /** Price of the cheap resource, as a decimal string. */
  PAID_SERVICE_PRICE: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .default('0.08'),
  /** Price of the resource the demo budget cannot afford. */
  PAID_SERVICE_PREMIUM_PRICE: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .default('0.75'),
  /** x402 facilitator that verifies and settles. */
  X402_FACILITATOR_URL: z.string().url().default('https://api.testnet.blocky402.com'),
  /** CAIP-2 network, which must be one the facilitator supports. */
  X402_NETWORK: z
    .string()
    .regex(/^[^:]+:[^:]+$/, 'Must be a CAIP-2 identifier such as hedera:testnet.')
    .default('hedera:testnet'),
  /** Hedera token id to settle in, or `HBAR` for the native asset. */
  X402_ASSET: z.string().default('0.0.429274'),
  /** Decimal places of the settlement asset. */
  X402_ASSET_DECIMALS: z.coerce.number().int().min(0).max(18).default(6),
  /** Ticker shown beside a price in the catalog. */
  X402_ASSET_SYMBOL: z.string().default('USDC'),
  HEDERA_MIRROR_URL: z.string().url().default('https://testnet.mirrornode.hedera.com'),
  /** Public base URL, used to build the `resource` field in a 402. */
  PAID_SERVICE_PUBLIC_URL: z.string().url().optional(),
  LOG_LEVEL: z.string().default('info'),
});

/** A CAIP-2 network identifier, as the x402 packages type it. */
export type Caip2 = `${string}:${string}`;

/** Validated seller configuration. */
export type SellerConfig = Omit<z.infer<typeof schema>, 'X402_NETWORK'> & {
  X402_NETWORK: Caip2;
};

/**
 * Parses seller configuration.
 *
 * @param env - Raw environment, injected so tests can supply their own.
 * @returns Validated configuration.
 * @throws {Error} Naming the offending variables, never their values.
 */
export function loadSellerConfig(env: NodeJS.ProcessEnv = process.env): SellerConfig {
  const result = schema.safeParse(env);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid seller configuration. Check these variables: ${fields}`);
  }
  return { ...result.data, X402_NETWORK: result.data.X402_NETWORK as Caip2 };
}

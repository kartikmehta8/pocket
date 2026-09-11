/**
 * Request schemas: the guard on every trust boundary.
 *
 * Anything arriving from HTTP, MCP, or a vendor SDK is `unknown` until it has
 * passed through a schema in this module. Money is accepted only as a decimal
 * string, never as a JSON number, so precision cannot be lost before Pocket
 * ever sees the value.
 */

import { z } from 'zod';
import { ASSETS, CHAINS } from './assets.js';
import {
  AGENT_STATUSES,
  INITIATORS,
  PAYMENT_CATEGORIES,
  UNKNOWN_RECIPIENT_BEHAVIOURS,
} from './types.js';

/** An EVM-style address as used by the Hedera JSON-RPC relay. */
export const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, 'Must be a 0x-prefixed 20-byte address.');

/** An unsigned decimal amount string, validated for precision downstream. */
export const amountSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'Must be an unsigned decimal string.');

/** Supported asset ticker. */
export const assetSchema = z.enum(ASSETS);

/** Supported chain identifier. */
export const chainSchema = z.enum(CHAINS);

/** Supported payment category. */
export const categorySchema = z.enum(PAYMENT_CATEGORIES);

/** Body accepted by organization creation. */
export const createOrgSchema = z.object({
  name: z.string().min(1).max(120),
});

/** Body accepted when renaming an organization. */
export const renameOrgSchema = z.object({
  name: z.string().min(1).max(120),
});

/** Body accepted when minting an API key. */
export const createApiKeySchema = z.object({
  label: z.string().min(1).max(60),
});

/** Body accepted when establishing a dashboard session. */
export const createSessionSchema = z.object({
  /** Name to give the organization if this sign-in creates one. */
  orgName: z.string().min(1).max(120).optional(),
});

/** Body accepted by agent registration. */
export const createAgentSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

/** Body accepted when updating an agent's operational state. */
export const updateAgentSchema = z.object({
  status: z.enum(AGENT_STATUSES).optional(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

/**
 * Body accepted when moving an agent's balance to another agent.
 *
 * @remarks The whole balance, never a part of it. This exists so an agent can
 * be retired without stranding its funds, and "move what is left" is the only
 * question that has a right answer at that moment.
 */
export const transferAgentFundsSchema = z.object({
  toAgentId: z.string().min(1).max(64),
  asset: assetSchema.optional(),
});

/** Body accepted when setting an agent's spending envelope. */
export const setBudgetSchema = z.object({
  asset: assetSchema,
  dailyLimit: amountSchema,
  perTransactionLimit: amountSchema,
});

/** Body accepted when opening a task-scoped budget. */
export const createTaskBudgetSchema = z.object({
  label: z.string().min(1).max(160),
  asset: assetSchema,
  limit: amountSchema,
});

/** Body accepted when setting an agent's spending policy. */
export const setPolicySchema = z.object({
  allowedAssets: z.array(assetSchema).min(1),
  allowedChains: z.array(chainSchema).min(1),
  allowedCategories: z.array(categorySchema).min(1),
  maxTransactionAmount: amountSchema,
  trustedRecipients: z.array(addressSchema).default([]),
  unknownRecipientBehaviour: z.enum(UNKNOWN_RECIPIENT_BEHAVIOURS),
  /**
   * Value above which a payment needs human sign-off.
   *
   * `null` and absent both mean "no threshold". Null is accepted because that
   * is what the policy endpoint returns for an unset one, and a document the
   * API hands out has to be a document the API takes back.
   */
  approvalThreshold: amountSchema.nullish(),
  /** Ceiling on a payment's value in USD, as a decimal string of dollars. */
  maxUsdPerTransaction: amountSchema.nullish(),
});

/** Body accepted by payment preview and payment execution. */
export const paymentRequestSchema = z.object({
  agentId: z.string().min(1),
  amount: amountSchema,
  asset: assetSchema,
  chain: chainSchema,
  recipient: addressSchema,
  category: categorySchema,
  reason: z.string().min(1).max(500),
  taskBudgetId: z.string().min(1).optional(),
  initiatedBy: z.enum(INITIATORS).default('agent'),
  /** Free-form provenance, for example the x402 resource being paid for. */
  resource: z.string().max(500).optional(),
});

/** Parsed payment request. */
export type PaymentRequest = z.infer<typeof paymentRequestSchema>;

/** Parsed policy configuration. */
export type PolicyConfig = z.infer<typeof setPolicySchema>;

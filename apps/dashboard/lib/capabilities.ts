import 'server-only';

import type { LucideIcon } from 'lucide-react';

/** One tool the MCP server exposes to a connected agent. */
export interface Capability {
  /** Tool name exactly as an agent sees it. */
  tool: string;
  title: string;
  /** What it does, in one sentence. */
  summary: string;
  /** What the agent can do with the result that it could not do otherwise. */
  why: string;
  /** Whether it can move money. The distinction matters more than any other. */
  spends: boolean;
}

/**
 * Every tool an agent connected to Purse can call.
 *
 * Mirrors `apps/mcp/src/tools.ts`. Kept as data rather than prose so the page
 * cannot drift into describing tools that do not exist.
 */
export const CAPABILITIES: readonly Capability[] = [
  {
    tool: 'purse_pay_for_resource',
    title: 'Buy a paid resource',
    summary: 'Fetch any URL and, if it answers 402, pay for it and return the content.',
    why: 'The agent gets data it could not otherwise reach, without ever holding a key.',
    spends: true,
  },
  {
    tool: 'purse_preview_payment',
    title: 'Check before committing',
    summary: 'Ask whether a payment would be allowed, without recording or settling anything.',
    why: 'Lets the agent pick an affordable provider before it starts, not after a refusal.',
    spends: false,
  },
  {
    tool: 'purse_create_task_budget',
    title: 'Open a task budget',
    summary: 'Ring-fence an amount for one unit of work, on top of the daily budget.',
    why: 'A runaway loop burns through one task envelope instead of the whole day.',
    spends: false,
  },
  {
    tool: 'purse_list_agents',
    title: 'List agents',
    summary: 'Every agent with its wallet, daily budget and spend so far today.',
    why: 'The agent can see what it has left before planning work it cannot afford.',
    spends: false,
  },
  {
    tool: 'purse_get_agent',
    title: 'Read one agent',
    summary: 'Policy, task budgets and on-chain wallet balance for a single agent.',
    why: 'Tells the agent which assets, categories and recipients it is permitted to use.',
    spends: false,
  },
  {
    tool: 'purse_spend_summary',
    title: 'Summarise spending',
    summary: 'Spend over a window by category and recipient, with anomalies flagged.',
    why: 'Answers "how much did this cost, and is anything unusual?" without a human looking.',
    spends: false,
  },
  {
    tool: 'purse_list_payments',
    title: 'List payments',
    summary: 'Recent payments, including the ones policy blocked and the reason each was refused.',
    why: 'A refused agent can read why and adapt, rather than retrying the same thing.',
    spends: false,
  },
  {
    tool: 'purse_audit_trail',
    title: 'Read the audit trail',
    summary: 'The organization audit trail, newest first.',
    why: 'Every decision is reconstructable, by a person or by the agent itself.',
    spends: false,
  },
];

/** One thing a vendor does that Purse could not do without it. */
export interface Integration {
  name: string;
  role: string;
  detail: string;
  /** Set at render time; the icon component cannot cross a server boundary. */
  icon?: LucideIcon;
}

/** What each vendor is actually responsible for. */
export const INTEGRATIONS: readonly Integration[] = [
  {
    name: 'Privy',
    role: 'Custody and signing',
    detail:
      'Holds every agent wallet and signs on instruction. No private key reaches Purse, the database, the model, or a log line. A second, provider-side ceiling sits underneath Purse’s own policy.',
  },
  {
    name: 'Hedera',
    role: 'Settlement',
    detail:
      'Where the money actually moves. Payments settle in USDC through an x402 facilitator that pays the gas, so an agent needs no native token to transact and every payment has a public receipt.',
  },
  {
    name: 'The Graph',
    role: 'Indexing and pricing',
    detail:
      'Indexes settled transfers for reconciliation, and composes two independent products to price a payment in USD. When they disagree beyond tolerance, Purse refuses to price and the policy denies.',
  },
];

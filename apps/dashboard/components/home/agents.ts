/**
 * The agent runtimes Pocket gives a wallet to.
 *
 * Logos are the vendors' own marks, used to say what Pocket works with. None of
 * these projects has reviewed or endorsed Pocket.
 */

/** One agent runtime, as the hero names it. */
export interface AgentBrand {
  /** How it reads inside the sentence "Give your ___ its own wallet". */
  name: string;
  /** Path under `public/`. */
  logo: string;
}

/** Cycled through in the headline, in this order. */
export const AGENT_BRANDS: readonly AgentBrand[] = [
  { name: 'Hermes agent', logo: '/logos/hermes.jpg' },
  { name: 'Claude Code', logo: '/logos/claude.svg' },
  { name: 'Codex', logo: '/logos/codex.svg' },
];

/** How long each name holds before the next, in milliseconds. */
export const ROTATE_MS = 2400;

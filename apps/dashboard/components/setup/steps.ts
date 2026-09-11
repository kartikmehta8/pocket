import type { LucideIcon } from 'lucide-react';
import { Bot, Coins, Gauge, KeyRound, PlugZap, ShieldHalf, ShoppingCart } from 'lucide-react';

/** One step of the guide, as both the list and the rail name it. */
export interface StepMeta {
  title: string;
  icon: LucideIcon;
}

/**
 * The seven steps, in order.
 *
 * @remarks One list for the step bodies and the progress rail, so the two
 * cannot disagree about what a step is called or which glyph marks it.
 */
export const STEPS = [
  { title: 'Register an agent', icon: Bot },
  { title: 'Check its funding', icon: Coins },
  { title: 'Set a daily budget', icon: Gauge },
  { title: 'Write a spending policy', icon: ShieldHalf },
  { title: 'Create an API key', icon: KeyRound },
  { title: 'Connect your agent runtime', icon: PlugZap },
  { title: 'Make the first purchase', icon: ShoppingCart },
] as const satisfies readonly StepMeta[];

/** The anchor a step's heading carries, so the rail can jump to it. */
export function stepAnchor(index: number): string {
  return `step-${index}`;
}

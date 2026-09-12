'use client';

/**
 * The control that marks a step nobody can verify as done.
 */

import { Check } from 'lucide-react';

import { Button, type ButtonVariant } from '@/components/ui/button';

/** Props for {@link ConfirmStepButton}. */
export interface ConfirmStepButtonProps {
  /** Whether the step before this one is done, which is what unlocks it. */
  ready: boolean;
  /** Called when the operator confirms this step. */
  onDone: () => void;
  /** What pressing it achieves, shown once the step is available. */
  hint: string;
  /** What is still missing, shown while it is not. */
  blocked: string;
  variant?: ButtonVariant;
}

/**
 * The control that marks a step nobody can verify as done.
 *
 * @remarks Steps six and seven happen in a terminal Pocket cannot see into, so
 * the operator says when they are finished and the guide takes their word.
 *
 * The explanation sits beside the button as ordinary text rather than in a
 * tooltip. A tooltip on a disabled control is the worst place to put the only
 * reason it is disabled: `Tooltip.Trigger` clones its child without making it
 * focusable, and a disabled button takes no focus of its own, so the reason
 * would be reachable by hover alone.
 */
export function ConfirmStepButton({
  ready,
  onDone,
  hint,
  blocked,
  variant = 'primary',
}: ConfirmStepButtonProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant={variant} icon={Check} onClick={onDone} disabled={!ready}>
        I have done this
      </Button>
      <span className="text-text-muted text-xs">{ready ? hint : blocked}</span>
    </div>
  );
}

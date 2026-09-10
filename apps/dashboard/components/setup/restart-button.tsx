'use client';

import { ListRestart } from 'lucide-react';

import { Button } from '@/components/ui/button';

/** Props for {@link RestartButton}. */
export interface RestartButtonProps {
  /** Puts the guide back to an empty run. */
  onRestart: () => void;
  /** Whether the server is re-rendering after a press. */
  pending: boolean;
  /**
   * Accessible name, distinguishing this copy from the other.
   *
   * @remarks Must contain the visible text. Voice control matches on what is
   * written on the button, so an accessible name that omits it leaves
   * "click Restart guide" activating nothing.
   */
  label: string;
}

/**
 * Starts the walkthrough over.
 *
 * @remarks Rendered twice on a finished run, at the head of the guide and at
 * its foot, because either is where the reader might be when they decide to
 * go again. The visible text is the same in both places and the accessible
 * name is not, so a screen-reader user picking from a list of controls can
 * tell which is which.
 */
export function RestartButton({ onRestart, pending, label }: RestartButtonProps) {
  return (
    <Button
      variant="secondary"
      icon={ListRestart}
      loading={pending}
      onClick={onRestart}
      aria-label={label}
      className="shrink-0"
    >
      {pending ? 'Restarting' : 'Restart guide'}
    </Button>
  );
}

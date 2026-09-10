import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/cn';

/** Props for {@link ExpandButton}. */
export interface ExpandButtonProps {
  open: boolean;
  /** Nothing to show; the control stays put so the column does not jump. */
  disabled?: boolean;
  /** What is being revealed, for the accessible name. */
  subject: string;
  onClick: () => void;
}

/** The chevron that opens a row's detail, in a table or a stacked card. */
export function ExpandButton({ open, disabled = false, subject, onClick }: ExpandButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      disabled={disabled}
      aria-label={`${open ? 'Hide' : 'Show'} ${subject}`}
      className="text-ash-400 hover:bg-ash-100 hover:text-text inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <ChevronRight
        aria-hidden
        className={cn(
          'size-4 transition-transform duration-(--duration-fast) ease-(--ease-brand)',
          open && 'rotate-90',
        )}
        strokeWidth={2}
      />
    </button>
  );
}

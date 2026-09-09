'use client';

import { Check, Copy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/cn';

/** Props for {@link CopyButton}. */
export interface CopyButtonProps {
  /** Full value written to the clipboard. */
  value: string;
  /** What is being copied, used for the accessible name. */
  label: string;
  className?: string;
}

/**
 * Icon button that copies a value and confirms with a checkmark for 1.6s.
 * The confirmation is announced politely for screen readers.
 */
export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(value).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  }, [value]);

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      className={cn(
        'text-ash-400 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm',
        'hover:bg-ash-50 hover:text-text-secondary transition-colors duration-(--duration-fast) ease-(--ease-brand)',
        className,
      )}
    >
      {copied ? (
        <Check aria-hidden className="text-success-ink size-3.5" strokeWidth={2.25} />
      ) : (
        <Copy aria-hidden className="size-3.5" strokeWidth={2} />
      )}
      <span className="sr-only" aria-live="polite">
        {copied ? `${label} copied to clipboard` : ''}
      </span>
    </button>
  );
}

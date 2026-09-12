/**
 * A copyable block of exact text.
 */

import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { CopyButton } from './copy-button';

/** Props for {@link CodeBlock}. */
export interface CodeBlockProps {
  /** Exact text, copied verbatim. Line breaks are preserved. */
  code: string;
  /** What the block contains, used for the copy button's accessible name. */
  label: string;
  /** Optional caption strip above the code — a filename, a shell, a header name. */
  caption?: ReactNode;
  /**
   * Wrap onto several lines instead of scrolling sideways.
   *
   * @remarks For anything that would otherwise overflow its column: a prompt,
   * a sentence, a URL. Text with spaces breaks at them and only a word longer
   * than the line is split, so the wrap is invisible until it has to happen.
   *
   * Leave it off for a command or a hash, where a value that runs past the
   * edge is a signal worth keeping. It costs nothing either way: the copy
   * button hands over the exact text, so no wrap is ever transcribed by hand.
   */
  wrap?: boolean;
  className?: string;
}

/**
 * A copyable block of exact text: a command, a config file, a header value.
 *
 * Scrolls horizontally inside its own box by default rather than wrapping,
 * because a wrapped address or JSON pointer is easy to mis-transcribe by hand
 * — and the copy button means nobody has to. Pass `wrap` where the value has
 * to fit a narrow column instead.
 */
export function CodeBlock({ code, label, caption, wrap = false, className }: CodeBlockProps) {
  return (
    <div className={cn('border-border bg-ash-50 overflow-hidden rounded-md border', className)}>
      {caption === undefined ? null : (
        <div className="border-divider text-text-muted flex items-center justify-between gap-2 border-b px-3 py-1.5 text-xs">
          {caption}
        </div>
      )}
      <div className="flex items-start gap-2 px-3 py-2.5">
        <pre
          className={cn(
            'text-text-secondary min-w-0 flex-1 font-mono text-xs leading-relaxed',
            wrap ? 'break-words whitespace-pre-wrap' : 'no-scrollbar overflow-x-auto',
          )}
        >
          <code>{code}</code>
        </pre>
        <CopyButton value={code} label={label} className="mt-px" />
      </div>
    </div>
  );
}

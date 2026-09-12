'use client';

/**
 * An in-page link that scrolls without writing a fragment into the URL.
 */

import type { ReactNode } from 'react';

/**
 * An in-page link that scrolls without writing a fragment into the URL.
 *
 * The `href` is kept so the control is a real link: it is focusable, it
 * announces as a link, it works with no JavaScript, and it can be opened in a
 * new tab. The click handler then takes over and scrolls, so the address bar
 * never picks up a `#section` the reader did not ask for.
 *
 * @param targetId `id` of the section to scroll to.
 * @param className Styling for the anchor.
 * @param children Link content.
 *
 * @remarks With no target the click falls through to the browser’s own anchor
 * handling rather than being swallowed. Focus moves with the scroll, or a
 * keyboard user’s next Tab resumes from the navigation.
 */
export function ScrollLink({
  targetId,
  className,
  children,
  onNavigate,
}: {
  targetId: string;
  className?: string;
  children: ReactNode;
  /** Called after a successful scroll, so a menu can close itself. */
  onNavigate?: () => void;
}) {
  return (
    <a
      href={`#${targetId}`}
      className={className}
      onClick={(event) => {
        const target = document.getElementById(targetId);
        if (target === null) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.focus({ preventScroll: true });
        onNavigate?.();
      }}
    >
      {children}
    </a>
  );
}

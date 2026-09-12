/** A call to action: what the button says and where it goes. */
export interface HomeCta {
  label: string;
  href: string;
}

/**
 * The action the marketing page offers a visitor.
 *
 * @param signedIn Whether the visitor already has a session.
 * @returns The label and destination every call to action on the page shares.
 * @remarks One source for four buttons — the nav, the hero, the closing panel
 * and the footer. Someone who is already signed in being invited to "start
 * free" reads as a page that does not know who is looking at it, and the way
 * that happens is four components deciding the same thing separately.
 */
export function homeCta(signedIn: boolean): HomeCta {
  return signedIn
    ? { label: 'Open dashboard', href: '/dashboard' }
    : { label: 'Start free', href: '/login' };
}

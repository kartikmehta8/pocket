'use client';

import { useIdentityToken, usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

/** How often to re-post the access token, in milliseconds. */
const REFRESH_INTERVAL = 10 * 60 * 1000;

/**
 * Keeps the server's session cookie in step with the browser's Privy session.
 *
 * Privy issues short-lived access tokens and refreshes them in the background.
 * The cookie the server reads has no such machinery, so this component pushes
 * the current token back to `/api/session` on mount, on an interval, and
 * whenever the tab regains focus. Renders nothing.
 */
export function SessionSync() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const { identityToken } = useIdentityToken();
  const router = useRouter();
  // Guards against two syncs racing when a refresh and a focus event coincide.
  const syncing = useRef(false);

  const sync = useCallback(async () => {
    if (!ready || !authenticated || syncing.current) return;
    syncing.current = true;
    try {
      const token = await getAccessToken();
      if (token === null) return;
      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, idToken: identityToken }),
      });
    } catch {
      // A failed refresh is not fatal. The existing cookie stays valid until
      // it expires, and the next tick tries again.
    } finally {
      syncing.current = false;
    }
  }, [ready, authenticated, getAccessToken, identityToken]);

  useEffect(() => {
    void sync();
    const timer = setInterval(() => void sync(), REFRESH_INTERVAL);
    const onFocus = () => void sync();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [sync]);

  // Privy can end a session in another tab. When that happens the cookie is
  // stale, so send the browser back to sign-in rather than letting the next
  // navigation render a wall of unauthorized panels.
  useEffect(() => {
    if (ready && !authenticated) router.replace('/login');
  }, [ready, authenticated, router]);

  return null;
}

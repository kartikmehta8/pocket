import 'server-only';

import { cookies } from 'next/headers';

/**
 * Name of the cookie holding the identity token.
 *
 * @remarks Set `httpOnly`, so the token the API trusts is never readable from
 * client JavaScript. The browser still holds its own copy inside the Privy
 * SDK; this one exists so server components and server actions can call the
 * API as the signed-in person.
 */
export const SESSION_COOKIE = 'pocket_session';

/**
 * Cookie attributes shared by the routes that set and clear the session.
 *
 * @param secure Whether to mark the cookie `Secure`. False only over plain
 *   HTTP in local development, where the attribute would prevent it being set
 *   at all.
 * @returns Attributes for `cookies().set`.
 */
export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    // Privy access tokens are short-lived and refreshed by the browser, so the
    // cookie only needs to outlive a single page view. An hour is generous.
    maxAge: 60 * 60,
  };
}

/**
 * Reads the caller's identity token.
 *
 * @returns The token, or `null` when nobody is signed in.
 */
export async function sessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

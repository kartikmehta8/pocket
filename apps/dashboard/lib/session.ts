/**
 * The session cookie: its name, its attributes, and who is signed in.
 */

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
 *
 * @remarks Privy access tokens are short-lived and refreshed by the browser, so
 * the cookie only needs to outlive a single page view. An hour is generous.
 */
export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
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

/**
 * Whether the caller is signed in.
 *
 * @returns `true` when a session cookie is present, or when the deployment
 *   runs on a single API key and has no identity provider at all.
 * @remarks The same rule the middleware applies, so the marketing page and the
 *   gate in front of it can never disagree about who is looking.
 */
export async function isSignedIn(): Promise<boolean> {
  return (await sessionToken()) !== null || (process.env.POCKET_API_KEY ?? '') !== '';
}

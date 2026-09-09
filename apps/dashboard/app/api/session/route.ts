/**
 * Session exchange.
 *
 * The browser holds a Privy access token; server components need one too. This
 * route is the handover: it proves the token works by using it against the
 * Pocket API, and only then writes it into an `httpOnly` cookie. A token that
 * the API refuses never becomes a session.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';

/** Never cached, never prerendered — this route only ever mutates a cookie. */
export const dynamic = 'force-dynamic';

/** Shape the browser posts when it has a fresh token. */
interface SessionRequest {
  token?: unknown;
  /**
   * Privy identity token, which carries the user's profile claims.
   *
   * Optional. Without it the API cannot read an email address, so a brand-new
   * organization gets a generic name instead of one derived from the domain.
   * It is forwarded, never stored.
   */
  idToken?: unknown;
}

/** Resolve the API base URL, without a trailing slash. */
function apiBaseUrl(): string {
  return (process.env.POCKET_API_URL ?? 'http://localhost:8080').replace(/\/+$/, '');
}

/**
 * Establishes a dashboard session.
 *
 * @param request Carries `{ token }` from the Privy client SDK.
 * @returns The organization and user on success; a contract error otherwise.
 * @remarks Calls `POST /v1/auth/session`, which provisions an organization the
 *   first time a person signs in. The response can carry a one-time API key,
 *   and it is passed straight back to the browser without being stored: the
 *   setup screen shows it once, and nothing can retrieve it afterwards.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as SessionRequest;
  const token = typeof body.token === 'string' ? body.token : '';
  const idToken = typeof body.idToken === 'string' ? body.idToken : '';
  if (token === '') {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'A token is required.' } },
      { status: 400 },
    );
  }

  const response = await fetch(`${apiBaseUrl()}/v1/auth/session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(idToken === '' ? {} : { 'x-identity-token': idToken }),
    },
    body: JSON.stringify({}),
    cache: 'no-store',
  }).catch(() => null);

  if (response === null) {
    return NextResponse.json(
      { error: { code: 'UNREACHABLE', message: 'Could not reach the Pocket API.' } },
      { status: 502 },
    );
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    return NextResponse.json(payload ?? {}, { status: response.status });
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions(request.url.startsWith('https://')));
  return NextResponse.json(payload);
}

/**
 * Ends a dashboard session.
 *
 * @returns An empty acknowledgement once the cookie is gone.
 */
export async function DELETE(): Promise<NextResponse> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}

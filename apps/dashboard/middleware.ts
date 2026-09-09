/**
 * Route protection.
 *
 * A first pass only: it checks that a session cookie exists, not that the
 * token inside it is still valid. Verification belongs to the API, which does
 * it on every request. This exists so a signed-out visitor lands on the sign-in
 * screen instead of watching five panels render "Unauthorized".
 */

import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_COOKIE } from '@/lib/session';

/** Paths reachable without a session. The homepage is one of them. */
const PUBLIC_PATHS = ['/login', '/api/session'];

/** The marketing homepage, which anyone may see. */
const HOME = '/';

/**
 * Redirects anonymous visitors to the sign-in screen.
 *
 * @param request Incoming request.
 * @returns A redirect, or a pass-through.
 * @remarks Skipped entirely when `POCKET_API_KEY` is set, which is how the
 *   single-tenant local setup runs without an identity provider.
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const signedIn = request.cookies.has(SESSION_COOKIE) || Boolean(process.env.POCKET_API_KEY);

  // Someone who is already signed in has no use for the pitch.
  if (pathname === HOME) {
    return signedIn
      ? NextResponse.redirect(new URL('/dashboard', request.url))
      : NextResponse.next();
  }

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) return NextResponse.next();
  if (signedIn) return NextResponse.next();

  const login = new URL('/login', request.url);
  // Preserve where they were heading, so sign-in returns them to it.
  login.searchParams.set('next', pathname);
  return NextResponse.redirect(login);
}

/**
 * Everything except Next's own assets and static files.
 *
 * @remarks The extension check matters: without it a logo on the public
 * homepage is treated as a protected route, redirected to sign-in, and never
 * renders for the anonymous visitor it was put there for.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|mp4|webm|woff2?)$).*)',
  ],
};

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

/** The sign-in screen, which is the one page a session sends you away from. */
const LOGIN = '/login';

/**
 * Files a crawler asks for before it has any notion of a session.
 *
 * @remarks Redirected to sign-in, `robots.txt` answers with an HTML login
 * page, which a crawler reads as "no rules" — and the sitemap it names would
 * do the same. Both have to be reachable by anyone.
 */
const CRAWLER_FILES = ['/robots.txt', '/sitemap.xml'];

/**
 * Paths reachable without a session.
 *
 * @param pathname Path of the incoming request.
 * @returns Whether the middleware should let it through ungated.
 * @remarks The marketing page is public in both directions: signed in or not,
 * anyone may read it. The session endpoint has to stay open because signing in
 * and signing out both go through it.
 */
function isPublic(pathname: string): boolean {
  return (
    pathname === '/' || pathname.startsWith('/api/session') || CRAWLER_FILES.includes(pathname)
  );
}

/**
 * Redirects anonymous visitors to the sign-in screen, and signed-in visitors
 * away from it.
 *
 * @param request Incoming request.
 * @returns A redirect, or a pass-through.
 * @remarks Every gate here is skipped when `POCKET_API_KEY` is set, which is
 *   how the single-tenant local setup runs without an identity provider.
 *
 * Signing in again is the one thing a signed-in visitor cannot usefully do: the
 * screen would authenticate them a second time and send them here anyway.
 *
 * Preserve where they were heading, so sign-in returns them to it.
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const signedIn = request.cookies.has(SESSION_COOKIE) || Boolean(process.env.POCKET_API_KEY);

  if (pathname === LOGIN || pathname.startsWith(`${LOGIN}/`)) {
    return signedIn
      ? NextResponse.redirect(new URL('/dashboard', request.url))
      : NextResponse.next();
  }

  if (isPublic(pathname)) return NextResponse.next();
  if (signedIn) return NextResponse.next();

  const login = new URL('/login', request.url);
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

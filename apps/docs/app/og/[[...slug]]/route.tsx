/**
 * Social preview images, one per documentation page, drawn in the product's
 * own materials and prerendered at build time.
 */

import { ImageResponse } from 'next/og';

import { POWERED_BY, SITE_NAME, siteUrl } from '@/lib/brand';
import { source } from '@/lib/source';

/**
 * Social preview images, one per documentation page.
 *
 * A route handler rather than the `opengraph-image` file convention. That
 * convention is a route segment, and Next refuses one after an optional
 * catch-all, which is what the documentation route itself is. The handler is
 * still prerendered: `generateStaticParams` enumerates the same pages the
 * sidebar is built from and `force-static` writes each PNG during the build,
 * so a crawler is served a file rather than waiting on a render.
 *
 * `/og/using/budgets` carries the card for `/docs/using/budgets`; `/og` alone
 * carries the one for the landing page.
 */
export const dynamic = 'force-static';

/** The size every social preview expects. */
const SIZE = { width: 1200, height: 630 };

/** How each part of the documentation names itself on a card. */
const SECTIONS: Record<string, string> = {
  using: 'Using Pocket',
  stack: 'Built on',
};

/** The theme, as far as a card needs it. */
const THEME = {
  canvas: '#f7f9f3',
  surface: '#ffffff',
  ink: '#000000',
  muted: '#6b6b6b',
  accent: '#4f46e5',
};

/**
 * Renders every page's card at build time rather than on request.
 *
 * @returns One parameter set per page in the tree.
 */
export function generateStaticParams() {
  return source.generateParams();
}

/**
 * One page's social preview image.
 *
 * Drawn in the product's own materials — warm canvas, a true-black hairline,
 * a generous radius and the offset shadow a lifted card carries — so a link
 * shared into a chat looks like the site it leads to.
 *
 * @param _request The incoming request, unused.
 * @param context Route parameters carrying the page slug.
 * @returns A PNG, or 404 when the slug names no page.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug?: string[] }> },
): Promise<Response> {
  const { slug } = await context.params;
  const page = source.getPage(slug);
  if (!page) return new Response('Not found', { status: 404 });

  const section = SECTIONS[slug?.[0] ?? ''] ?? 'Documentation';
  const host = siteUrl().replace(/^https?:\/\//, '');

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        padding: 48,
        background: THEME.canvas,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 56,
          borderRadius: 24,
          border: `3px solid ${THEME.ink}`,
          background: THEME.surface,
          boxShadow: `8px 8px 0 0 ${THEME.ink}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em' }}>
              {SITE_NAME}
            </span>
            <span
              style={{
                width: 9,
                height: 9,
                marginLeft: 5,
                marginBottom: 7,
                borderRadius: 999,
                background: THEME.accent,
              }}
            />
            <span style={{ fontSize: 28, marginLeft: 14, color: THEME.muted }}>Docs</span>
          </div>
          <span
            style={{
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: THEME.muted,
            }}
          >
            {section}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              color: THEME.ink,
            }}
          >
            {page.data.title}
          </div>
          {page.data.description === undefined ? null : (
            <div
              style={{
                marginTop: 24,
                fontSize: 28,
                lineHeight: 1.4,
                color: THEME.muted,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {page.data.description}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                width: 40,
                height: 4,
                borderRadius: 999,
                background: THEME.accent,
                marginRight: 16,
              }}
            />
            <span style={{ fontSize: 22, color: THEME.muted }}>{POWERED_BY}</span>
          </div>
          <span style={{ fontSize: 22, color: THEME.muted }}>{host}</span>
        </div>
      </div>
    </div>,
    { ...SIZE, headers: { 'cache-control': 'public, max-age=0, must-revalidate' } },
  );
}

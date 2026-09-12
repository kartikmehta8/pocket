/**
 * The document shell: fonts, site-wide metadata and the Fumadocs provider.
 */

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { DM_Sans, Space_Mono } from 'next/font/google';
import { RootProvider } from 'fumadocs-ui/provider/next';

import { DESCRIPTION, DOCS_NAME, SITE_NAME, TAGLINE, siteUrl } from '@/lib/brand';

import './global.css';

/** Interface face, matched to the product site. */
const sans = DM_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-dm-sans' });

/** Monospace face, reserved for values a reader may need to copy exactly. */
const mono = Space_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '700'],
  variable: '--font-space-mono',
});

/**
 * Site-wide metadata.
 *
 * @remarks No `openGraph.title`, `openGraph.description` or image here on
 * purpose. Every page under `/docs` generates its own card — title, summary
 * and a rendered image naming the page — and a value set at the root would
 * win over the per-page one for any field the route does not also set.
 *
 * `metadataBase` is what makes every relative address absolute. Without it a
 * relative image reaches a preview renderer as a path it cannot fetch.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${DOCS_NAME}: ${TAGLINE}`, template: `%s · ${DOCS_NAME}` },
  description: DESCRIPTION,
  applicationName: DOCS_NAME,
  keywords: [
    'Pocket documentation',
    'AI agent payments',
    'agent spending limits',
    'x402',
    'stablecoin payments',
    'agent wallet',
    'MCP',
  ],
  openGraph: { type: 'website', siteName: DOCS_NAME, locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  alternates: { canonical: '/docs' },
  other: { 'apple-mobile-web-app-title': SITE_NAME },
};

/** Light mode only — no theme toggle, no dark palette. */
export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f7f9f3',
};

/**
 * Document shell.
 *
 * The theme switcher is disabled. The product site is light only, and a docs
 * site that could be dark would not be the same product.
 *
 * @param children The active route.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider theme={{ enabled: false, defaultTheme: 'light' }}>{children}</RootProvider>
      </body>
    </html>
  );
}

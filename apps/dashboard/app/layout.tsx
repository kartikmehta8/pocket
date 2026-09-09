import type { Metadata, Viewport } from 'next';
import { DM_Sans, Space_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

import { DESCRIPTION, TAGLINE } from '@/lib/brand';
import { Providers } from './providers';

import './globals.css';

/** Interface face. Variable weight, so no separate file per weight is fetched. */
const sans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
});

/** Monospace face, reserved for values a reader may need to copy exactly. */
const mono = Space_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '700'],
  variable: '--font-space-mono',
});

/** Document metadata for every route. */
export const metadata: Metadata = {
  title: { default: `Pocket: ${TAGLINE}`, template: '%s · Pocket' },
  description: DESCRIPTION,
};

/** Light mode only — no theme toggle, no dark palette. */
export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f7f7f4',
};

/**
 * Document shell.
 *
 * Deliberately thin: it owns the fonts and the client providers, and nothing
 * else. Each route group brings its own chrome, so the sign-in screen is not
 * forced to render a navigation rail for an organization nobody has joined.
 *
 * @param children The active route group's layout.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '';
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh antialiased">
        {/*
          First thing in the tab order, invisible until focused. Without it a
          keyboard user traverses the whole navigation rail on every page.
        */}
        <a
          href="#main"
          className="focus:border-border focus:bg-surface focus:text-text sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:border focus:px-3 focus:py-2 focus:text-sm focus:font-medium"
        >
          Skip to content
        </a>
        <Providers appId={appId}>{children}</Providers>
      </body>
    </html>
  );
}

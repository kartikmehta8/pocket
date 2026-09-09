import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DM_Sans, Space_Mono } from 'next/font/google';
import { RootProvider } from 'fumadocs-ui/provider/next';

import { DESCRIPTION } from '@/lib/brand';

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

export const metadata: Metadata = {
  title: { default: 'Purse Docs', template: '%s · Purse Docs' },
  description: DESCRIPTION,
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

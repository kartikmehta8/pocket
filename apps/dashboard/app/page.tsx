import type { Metadata } from 'next';

import { TAGLINE, DESCRIPTION } from '@/lib/brand';
import { MarketingFooter } from '@/components/home/chrome';
import { Closer } from '@/components/home/closer';
import { CreateAgent } from '@/components/home/create';
import { Hero } from '@/components/home/hero';
import { FloatingNav } from '@/components/home/nav';
import { Preview } from '@/components/home/preview';
import { X402Banner } from '@/components/home/x402-banner';

export const metadata: Metadata = {
  title: `Pocket: ${TAGLINE}`,
  description: DESCRIPTION,
};

/**
 * The public homepage.
 *
 * Three blocks and a close: the pitch, what setting it up looks like and where
 * the money goes, then what it reports back. Anyone already signed in is sent
 * to their dashboard by the middleware rather than being shown any of it again.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <FloatingNav />

      <main id="main" className="flex-1">
        <Hero />
        <X402Banner />
        <CreateAgent />
        <Preview />
        <Closer />
      </main>

      <MarketingFooter />
    </div>
  );
}

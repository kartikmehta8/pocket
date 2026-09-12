import type { Metadata } from 'next';

import { TAGLINE, DESCRIPTION } from '@/lib/brand';
import { MarketingFooter } from '@/components/home/chrome';
import { Closer } from '@/components/home/closer';
import { CreateAgent } from '@/components/home/create';
import { Hero } from '@/components/home/hero';
import { FloatingNav } from '@/components/home/nav';
import { Preview } from '@/components/home/preview';
import { X402Banner } from '@/components/home/x402-banner';
import { isSignedIn } from '@/lib/session';

export const metadata: Metadata = {
  title: `Pocket: ${TAGLINE}`,
  description: DESCRIPTION,
};

/**
 * The public homepage.
 *
 * Three blocks and a close: the pitch, what setting it up looks like and where
 * the money goes, then what it reports back.
 *
 * Open to everyone, signed in or not. Someone who already has an organization
 * still has reason to read it — a link shared with a colleague, the
 * documentation, the pitch itself — so the page stays reachable and every call
 * to action on it changes to say what is actually on offer: the dashboard they
 * already have rather than an account they already made.
 *
 * @remarks Reading the session makes this route dynamic. It was prerendered
 * before, and the cost of rendering it per request is one cookie read against
 * a page that can no longer tell a signed-in reader the wrong thing.
 */
export default async function HomePage() {
  const signedIn = await isSignedIn();

  return (
    <div className="flex min-h-dvh flex-col">
      <FloatingNav signedIn={signedIn} />

      <main id="main" className="flex-1">
        <Hero signedIn={signedIn} />
        <X402Banner />
        <CreateAgent />
        <Preview />
        <Closer signedIn={signedIn} />
      </main>

      <MarketingFooter signedIn={signedIn} />
    </div>
  );
}

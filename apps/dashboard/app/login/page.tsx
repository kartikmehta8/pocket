import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, GaugeCircle, Landmark, ShieldHalf } from 'lucide-react';

import { LoginPanel } from '@/components/auth/login-panel';
import { Wordmark } from '@/components/layout/wordmark';

export const metadata: Metadata = { title: 'Sign in' };

/** Nothing here is cacheable: the panel decides where to send the visitor. */
export const dynamic = 'force-dynamic';

/** The three claims worth making before someone has any data to look at. */
const PROOF = [
  {
    icon: ShieldHalf,
    title: 'Deny by default',
    body: 'An agent with no policy and no budget cannot spend. Every rule has to be granted explicitly.',
  },
  {
    icon: Landmark,
    title: 'Custody stays with Privy',
    body: 'Keys never reach the model, the database, or a log line. Purse authorises; Privy signs.',
  },
  {
    icon: GaugeCircle,
    title: 'Refusals are records',
    body: 'A blocked payment is a row with a reason, not a discarded event. The audit trail answers why.',
  },
] as const;

/**
 * Sign-in: a marketing column beside the control.
 *
 * Split layout rather than a bare centred box, because this is the first thing
 * a new operator sees and it has to say what the product enforces before
 * asking for an email address.
 */
export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="border-border bg-ash-25 relative hidden flex-col justify-between overflow-hidden border-r p-10 lg:flex">
        <div
          aria-hidden
          className="from-accent-100/70 pointer-events-none absolute -top-32 -left-24 size-[28rem] rounded-full bg-gradient-to-br to-transparent blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -bottom-40 size-[26rem] rounded-full bg-gradient-to-tl from-[#eb6834]/15 to-transparent blur-3xl"
        />

        <Wordmark href="/" />

        <div className="relative max-w-md">
          <h1 className="text-3xl leading-tight font-semibold tracking-tight">
            Let agents pay for what they need.
            <span className="text-text-muted block">Never more than you allowed.</span>
          </h1>
          <ul className="mt-8 flex flex-col gap-5">
            {PROOF.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <span className="border-border bg-surface shadow-e1 text-accent-600 flex size-8 shrink-0 items-center justify-center rounded-lg border">
                  <Icon aria-hidden className="size-4" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-text text-sm font-medium">{title}</p>
                  <p className="text-text-secondary mt-0.5 text-xs leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-text-muted relative flex items-center gap-1.5 text-xs">
          <BadgeCheck aria-hidden className="size-3.5" strokeWidth={1.75} />
          x402 payments settled on Hedera · indexed by The Graph
        </p>
      </section>

      <main id="main" className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Wordmark href="/" />
          </div>
          <h2 className="text-text mt-8 text-2xl font-semibold tracking-tight lg:mt-0">
            Sign in to Purse
          </h2>
          <p className="text-text-secondary mt-1.5 text-sm leading-relaxed">
            First time here? Signing in creates your organization and its first API key.
          </p>

          <div className="mt-7">
            <Suspense fallback={<div className="shimmer h-11 w-full rounded-md" />}>
              <LoginPanel configured={(process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '') !== ''} />
            </Suspense>
          </div>

          <p className="text-text-muted mt-6 text-xs">
            <Link href="/" className="hover:text-text underline underline-offset-4">
              Back to the homepage
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

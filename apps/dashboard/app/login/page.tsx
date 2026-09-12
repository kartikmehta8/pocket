import { Suspense } from 'react';
import type { Metadata } from 'next';

import { LoginPanel } from '@/components/auth/login-panel';
import { TrustMarks } from '@/components/auth/trust-marks';
import { Wordmark } from '@/components/layout/wordmark';

/**
 * Tab title and link preview for the sign-in screen.
 *
 * @remarks Kept out of search results. It is a door, not a page: everything
 * worth indexing is on the other side of it or on the marketing page.
 */
export const metadata: Metadata = {
  title: 'Sign in',
  description:
    'Sign in to Pocket, or create an organization. Nothing can spend until you say it may.',
  robots: { index: false, follow: true },
};

/** Nothing here is cacheable: the panel decides where to send the visitor. */
export const dynamic = 'force-dynamic';

/**
 * Sign-in: what Pocket runs on, beside the control that gets you in.
 *
 * Split layout rather than a bare centred box, because this is the first thing
 * a new operator sees and it has to answer "will this work with what I run,
 * and who holds the money" before asking for an email address.
 *
 * @remarks The page holds the viewport and does not scroll: both columns are
 * sized to fit, and the form column takes the overflow if a long error ever
 * makes it taller. Below `lg` the marketing column is gone, so the marks
 * repeat under the form — they are the part a stranger checks, and a phone is
 * where most of them arrive.
 */
export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:overflow-hidden">
      {/* Scrolls only if it must: at any ordinary window height the column
          fits, and clipping the logos would be worse than a scrollbar the
          few people on a very short screen ever see. */}
      <section className="border-border bg-ash-25 relative hidden flex-col justify-between gap-6 overflow-y-auto border-r p-8 lg:flex xl:p-10">
        {/* The two washes clip against their own layer rather than the column.
            Hanging off the edges of a scrollable parent, they would each add
            their overhang to its scroll height and produce a scrollbar for a
            column whose content fits. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="from-accent-100/70 absolute -top-32 -left-24 size-[28rem] rounded-full bg-gradient-to-br to-transparent blur-3xl" />
          <div className="absolute -right-32 -bottom-40 size-[26rem] rounded-full bg-gradient-to-tl from-[#eb6834]/15 to-transparent blur-3xl" />
        </div>

        <Wordmark href="/" />

        <div className="relative max-w-md">
          <h1 className="text-3xl leading-tight font-semibold tracking-tight">
            Let agents pay for what they need.
            <span className="text-text-muted block">Never more than you allowed.</span>
          </h1>
          <p className="text-text-secondary mt-4 text-sm leading-relaxed">
            An agent with no policy and no budget cannot spend anything. You grant each rule
            explicitly, Privy holds the keys, and every refusal is kept as a row with a reason.
          </p>
        </div>

        <TrustMarks className="relative max-w-lg" />
      </section>

      <main
        id="main"
        className="flex items-center justify-center p-6 sm:p-10 lg:h-dvh lg:overflow-y-auto"
      >
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Wordmark href="/" />
          </div>
          <h2 className="text-text mt-8 text-2xl font-semibold tracking-tight lg:mt-0">
            Sign in to Pocket
          </h2>
          <p className="text-text-secondary mt-1.5 text-sm leading-relaxed">
            First time here? Signing in creates your organization. Nothing can spend until you say
            it may.
          </p>

          <div className="mt-7">
            <Suspense fallback={<div className="shimmer h-11 w-full rounded-md" />}>
              <LoginPanel configured={(process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '') !== ''} />
            </Suspense>
          </div>

          <TrustMarks className="border-divider mt-8 border-t pt-6 lg:hidden" />
        </div>
      </main>
    </div>
  );
}

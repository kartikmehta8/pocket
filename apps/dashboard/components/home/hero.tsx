'use client';

/**
 * The marketing hero.
 */

import { ArrowRight, Ban, Check, Compass } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';

import { homeCta } from '@/lib/home-cta';
import { DURATION, EASE } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { AgentRotator } from './agent-rotator';
import { Money, SourceMark } from './marks';
import { ScrollLink } from './scroll-link';

/** The attempts that play out inside the hero's receipt card. */
const ATTEMPTS = [
  {
    Icon: Check,
    fill: 'bg-success-soft',
    title: 'Live token prices',
    source: { name: 'CoinGecko', logo: '/logos/coingecko.png' },
    amount: '0.01',
    detail: 'Paid, delivered in 1.2s',
  },
  {
    Icon: Check,
    fill: 'bg-success-soft',
    title: 'Ethereum gas estimate',
    source: { name: 'Ethereum node', logo: '/logos/ethereum.svg' },
    amount: '0.02',
    detail: 'Paid, delivered in 0.9s',
  },
  {
    Icon: Ban,
    fill: 'bg-danger-soft',
    title: 'Full market report',
    source: { name: 'DefiLlama', logo: '/logos/defillama.jpg' },
    amount: '0.75',
    detail: 'Refused, over today’s limit',
  },
] as const;

/**
 * Landing hero.
 *
 * The headline names the agent the visitor already runs, cycling through the
 * runtimes Pocket supports, so the offer reads as being about their setup rather
 * than about ours. The card beside it ends on a refusal: anyone can show an
 * agent buying something, and the reason to trust one with money is that it can
 * be stopped.
 *
 * @param signedIn Whether the visitor already has a session.
 */
export function Hero({ signedIn }: { signedIn: boolean }) {
  const cta = homeCta(signedIn);
  const reduced = useReducedMotion();
  const rise = (delay: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: DURATION.slow, ease: EASE, delay },
        };

  return (
    <section className="relative">
      <div aria-hidden className="dot-grid pointer-events-none absolute inset-0" />

      <div className="relative mx-auto grid w-full max-w-[76rem] items-center gap-12 px-5 pt-28 pb-16 sm:px-8 sm:pt-36 sm:pb-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div>
          <motion.h1
            {...rise(0)}
            className="text-text text-[2rem] leading-[1.2] font-bold tracking-tight sm:text-[3rem] sm:leading-[1.2]"
          >
            <span className="block">Give your</span>
            <AgentRotator />
            <span className="block">its own wallet.</span>
          </motion.h1>

          <motion.p
            {...rise(0.06)}
            className="text-text-secondary sm:text-md mt-5 max-w-lg text-base leading-relaxed"
          >
            Your agent buys the data and tools a job needs, out of a budget you set, with a spending
            limit it cannot argue its way past. You get a receipt for every attempt, including the
            ones it was refused.
          </motion.p>

          <motion.div {...rise(0.12)} className="mt-8 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="md" asChild className="h-11 px-5 text-sm">
              <Link href={cta.href}>
                {cta.label}
                <ArrowRight aria-hidden className="size-4" strokeWidth={2.25} />
              </Link>
            </Button>
            <Button variant="secondary" size="md" asChild className="h-11 px-5 text-sm">
              <ScrollLink targetId="create">
                <Compass aria-hidden className="size-4" strokeWidth={2} />
                See how it works
              </ScrollLink>
            </Button>
          </motion.div>

          {/* The promise under the button is about signing up, so it goes when
              the reader already has. */}
          {signedIn ? null : (
            <motion.p {...rise(0.18)} className="text-text-muted mt-6 text-xs">
              Free to start. Your first agent is running in under a minute.
            </motion.p>
          )}
        </div>

        <motion.div
          {...rise(0.1)}
          className="border-border bg-surface shadow-pop rounded-lg border p-4 sm:p-5"
        >
          <div className="border-divider flex items-center justify-between border-b pb-3">
            <div>
              <p className="text-text text-sm font-bold">Pricing a portfolio page</p>
              <p className="text-text-muted mt-0.5 text-xs">Today’s spend</p>
            </div>
            <p className="text-text font-mono text-xs">
              <Money value="0.03" />
              <span className="text-text-muted"> / 0.25</span>
            </p>
          </div>

          <ul className="mt-3 flex flex-col gap-2">
            {ATTEMPTS.map(({ Icon, fill, title, source, amount, detail }, index) => (
              <motion.li
                key={title}
                initial={reduced ? { opacity: 0 } : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: DURATION.base, ease: EASE, delay: 0.5 + index * 0.3 }}
                className="border-border flex items-start gap-3 rounded-md border p-3"
              >
                <span
                  aria-hidden
                  className={`border-border flex size-6 shrink-0 items-center justify-center rounded-md border ${fill}`}
                >
                  <Icon className="size-3" strokeWidth={2.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-text truncate text-sm font-medium">{title}</p>
                    <span className="text-text-muted figures shrink-0 font-mono text-xs">
                      {amount}
                    </span>
                  </div>
                  <p className="text-text-muted mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs leading-snug">
                    <SourceMark source={source} />
                    <span aria-hidden>·</span>
                    {detail}
                  </p>
                </div>
              </motion.li>
            ))}
          </ul>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: DURATION.slow, ease: EASE, delay: 1.5 }}
            className="text-text-muted mt-3 text-xs leading-relaxed"
          >
            The last one never reached a signature. Pocket decided before the wallet was asked.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

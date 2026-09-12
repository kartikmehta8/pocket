'use client';

/**
 * The closing panel of the marketing page.
 */

import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';

import { DURATION, EASE } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { AGENT_BRANDS } from '@/lib/agent-brands';
import { homeCta } from '@/lib/home-cta';
import { BudgetLine } from './budget-line';
import { Money } from './marks';

/** The daily ceiling quoted beside the line. */
const LIMIT = 2;

/**
 * The close.
 *
 * One line, one button, and a spend line that draws itself as it comes into
 * view, so the last thing on the page is the thing the product actually does:
 * stop at a number you chose.
 *
 * @param signedIn Whether the visitor already has a session.
 */
export function Closer({ signedIn }: { signedIn: boolean }) {
  const cta = homeCta(signedIn);
  const reduced = useReducedMotion();

  return (
    <section className="mx-auto w-full max-w-[76rem] px-5 pt-2 pb-20 sm:px-8">
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
        whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: DURATION.slow, ease: EASE }}
        className="border-border bg-accent-600 shadow-pop overflow-hidden rounded-lg border"
      >
        <div className="grid items-center gap-8 p-8 sm:p-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Give your agent a wallet
            </h2>
            <p className="mt-3 max-w-md leading-relaxed text-white/80">
              Set the limits once. After that it buys what the work needs, stops where you told it
              to, and shows you every purchase as it lands.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button variant="secondary" size="md" asChild className="h-11 px-5 text-sm">
                <Link href={cta.href}>
                  {cta.label}
                  <ArrowRight aria-hidden className="size-4" strokeWidth={2.25} />
                </Link>
              </Button>

              <ul className="flex items-center gap-2">
                {AGENT_BRANDS.map((brand, index) => (
                  <motion.li
                    key={brand.name}
                    initial={{ opacity: 0, scale: 0.85 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { duration: DURATION.base, ease: EASE, delay: 0.25 + index * 0.09 }
                    }
                    className="flex size-8 items-center justify-center overflow-hidden rounded-md border border-white/25 bg-white p-1"
                    title={brand.name}
                  >
                    <Image
                      src={brand.logo}
                      alt={brand.name}
                      width={32}
                      height={32}
                      unoptimized
                      className="size-full object-contain"
                    />
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-white/25 bg-white/10 p-5 backdrop-blur-sm">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium text-white">Daily spend</p>
              <p className="font-mono text-xs text-white/70">
                limit <Money value={LIMIT.toFixed(2)} as="ticker" />
              </p>
            </div>

            <div className="mt-3">
              <BudgetLine />
            </div>

            <p className="mt-2 text-sm leading-relaxed text-white/75">
              It runs close to the line on a busy day and stops dead at it. No overage, no surprise
              invoice, no conversation about what happened.
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

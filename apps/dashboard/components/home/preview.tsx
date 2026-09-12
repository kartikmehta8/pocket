'use client';

/**
 * A worked example of the dashboard, on the marketing page.
 */

import { motion, useReducedMotion } from 'motion/react';

import { DURATION, EASE } from '@/lib/motion';
import { Money } from './marks';
import { SpendPreview } from './spend-preview';
import { SAMPLE_SPEND, SAMPLE_STATS } from './sample-data';

/**
 * A worked example of what the dashboard shows.
 *
 * The figures come from `sample-data.ts` and are fixed. A public page has no
 * organization to read from, so nothing here is or claims to be live: the copy
 * describes one agent's fortnight, not the reader's own numbers.
 */
export function Preview() {
  const reduced = useReducedMotion();
  const rise = (delay: number) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 16 },
    whileInView: reduced ? { opacity: 1 } : { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: DURATION.slow, ease: EASE, delay },
  });

  return (
    <section
      id="preview"
      tabIndex={-1}
      className="mx-auto w-full max-w-[76rem] scroll-mt-28 px-5 py-16 outline-none sm:px-8"
    >
      <motion.div {...rise(0)} className="max-w-2xl">
        <h2 className="text-text text-2xl font-bold tracking-tight sm:text-3xl">
          Two weeks of one agent, and not one approval email
        </h2>
        <p className="text-text-secondary mt-3 leading-relaxed">
          This is a research agent buying data feeds on its own. It spent {SAMPLE_SPEND} across
          fourteen days, touched its ceiling once, and never went over. You did not sign off on any
          of it, and you can still say exactly where every cent went.
        </p>
      </motion.div>

      <motion.div {...rise(0.08)} className="border-border bg-surface mt-8 rounded-lg border">
        <div className="border-divider flex flex-wrap items-end justify-between gap-3 border-b px-5 py-4">
          <div>
            <h3 className="text-text text-md font-bold tracking-tight">Daily spend</h3>
            <p className="text-text-muted mt-0.5 text-sm">
              It runs close to the line on busy days and stops dead at it
            </p>
          </div>
          <p className="text-text text-2xl font-bold tracking-tight">
            <Money value={SAMPLE_SPEND} />
            <span className="text-text-muted ml-1.5 text-sm font-medium">in 14 days</span>
          </p>
        </div>

        <div className="px-2 pt-4 pb-4">
          <SpendPreview />
        </div>
      </motion.div>

      <motion.dl {...rise(0.14)} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SAMPLE_STATS.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
            whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: DURATION.base, ease: EASE, delay: 0.1 + index * 0.07 }}
            className="border-border bg-surface rounded-lg border p-5"
          >
            <dd className="text-text text-3xl font-bold tracking-tight">
              {stat.money ? (
                <Money value={stat.value} as="ticker" />
              ) : (
                <span className="figures">{stat.value}</span>
              )}
            </dd>
            <dt className="text-text mt-1 text-sm font-medium">{stat.label}</dt>
            <p className="text-text-muted mt-2 text-xs leading-relaxed">{stat.detail}</p>
          </motion.div>
        ))}
      </motion.dl>
    </section>
  );
}

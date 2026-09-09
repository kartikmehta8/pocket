'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';

import { DURATION, EASE } from '@/lib/motion';

/** What happens between an agent wanting something and having it. */
const STAGES = [
  {
    title: 'The seller names a price',
    body: 'Your agent asks for a resource. Instead of the data, it gets a bill.',
    logo: null,
  },
  {
    title: 'Purse checks your limits',
    body: 'Daily budget, job budget, single-payment cap, and whether this seller is one you allow.',
    logo: null,
    gate: true,
  },
  {
    title: 'The wallet signs',
    body: 'Only if every limit passed. The key stays with Privy and never reaches your agent.',
    logo: { src: '/logos/privy.png', name: 'Privy' },
  },
  {
    title: 'It settles in seconds',
    body: 'A few cents of stablecoin moves on Hedera. Fees are paid for you, so no top-ups.',
    logo: { src: '/logos/hedera.svg', name: 'Hedera' },
  },
  {
    title: 'The receipt is indexed',
    body: 'The Graph indexes it so your spend history reconciles against the chain, not just our database.',
    logo: { src: '/logos/graph.svg', name: 'The Graph' },
  },
] as const;

/**
 * The payment flow, shown as a timeline.
 *
 * Named vendors rather than hand-waving: someone handing money to software is
 * entitled to know whose custody it passes through. None of these projects has
 * reviewed or endorsed Purse.
 */
export function FlowPanel() {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: DURATION.slow, ease: EASE }}
      className="border-border bg-surface shadow-pop self-start overflow-hidden rounded-lg border"
    >
      <div className="border-divider border-b px-5 py-4">
        <p className="text-text text-sm font-bold">Where the money actually goes</p>
        <p className="text-text-muted mt-1 text-xs leading-relaxed">
          Five steps between your agent wanting something and having it.
        </p>
      </div>

      <ol className="relative px-5 py-4">
        {STAGES.map((stage, index) => (
          <motion.li
            key={stage.title}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: -8 }}
            whileInView={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: DURATION.base, ease: EASE, delay: 0.15 + index * 0.09 }}
            className="relative flex gap-3.5 pb-5 last:pb-0"
          >
            {index < STAGES.length - 1 ? (
              <span
                aria-hidden
                className="bg-divider absolute top-7 bottom-0 left-[0.6875rem] w-px"
              />
            ) : null}

            <span
              aria-hidden
              className={[
                'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-[0.625rem] font-bold',
                'gate' in stage && stage.gate
                  ? 'border-border bg-accent-600 text-white'
                  : 'border-border bg-canvas text-text',
              ].join(' ')}
            >
              {index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-text text-sm font-medium">{stage.title}</p>
                {stage.logo ? (
                  <span className="border-border bg-canvas inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-2 pl-1">
                    <span className="flex size-3.5 items-center justify-center overflow-hidden rounded-full">
                      <Image
                        src={stage.logo.src}
                        alt=""
                        width={16}
                        height={16}
                        unoptimized
                        className="size-full object-contain"
                      />
                    </span>
                    <span className="text-text-secondary text-[0.6875rem] font-medium">
                      {stage.logo.name}
                    </span>
                  </span>
                ) : null}
              </div>
              <p className="text-text-muted mt-1 text-xs leading-relaxed">{stage.body}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </motion.div>
  );
}

'use client';

import { motion, useReducedMotion } from 'motion/react';

import { DURATION, EASE } from '@/lib/motion';

/**
 * What your agent is allowed to buy from, and from whom.
 *
 * The banner is one white surface with no divider. The logo animation carries
 * an opaque white background of its own, so any other fill behind it would
 * render as a visible rectangle instead of a mark sitting on the card.
 *
 * The source is a 2160px square with the wordmark floating in a wide margin,
 * which at any honest size leaves the mark tiny. It is cropped here rather than
 * re-encoded: the video is sized well past its frame inside a fixed window and
 * centred, so the surrounding whitespace falls outside the window and the mark
 * fills it. Re-encoding would be tidier, but it would also fork a vendor's
 * asset, and this stays a byte-for-byte copy of what they publish.
 */
export function X402Banner() {
  const reduced = useReducedMotion();

  return (
    <section className="mx-auto w-full max-w-[76rem] px-5 pt-2 pb-12 sm:px-8">
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
        whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: DURATION.slow, ease: EASE }}
        className="border-border bg-surface shadow-pop flex flex-col items-start gap-5 rounded-lg border p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8"
      >
        {/*
          `mx-auto` centres the window on the cross axis while the banner is
          stacked. It is reset at `sm`, where the axis flips and auto margins
          would instead soak up the free space and shove the copy right.
        */}
        <span className="relative mx-auto block h-20 w-44 shrink-0 overflow-hidden sm:mx-0 sm:h-24 sm:w-52">
          <video
            className="absolute top-1/2 left-1/2 size-56 -translate-x-1/2 -translate-y-1/2 sm:size-64"
            autoPlay={!reduced}
            loop
            muted
            playsInline
            preload="metadata"
            aria-hidden
          >
            <source src="/logos/x402-logo.mp4" type="video/mp4" />
          </video>
        </span>

        <div className="min-w-0">
          <h2 className="text-text text-xl font-bold tracking-tight sm:text-2xl">
            Buy from any seller that speaks x402
          </h2>
          <p className="text-text-secondary mt-2 leading-relaxed">
            Pocket is not a marketplace and there is no catalogue to get listed in. Any API priced
            in the open x402 standard can take your agent’s money, whether we have heard of it or
            not.
          </p>
        </div>
      </motion.div>
    </section>
  );
}

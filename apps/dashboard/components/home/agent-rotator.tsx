'use client';

import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

import { DURATION, EASE } from '@/lib/motion';
import { AGENT_BRANDS, ROTATE_MS } from './agents';

/** Every name, read out once, for anyone who cannot see the animation. */
const SPOKEN = AGENT_BRANDS.map((brand) => brand.name).join(', ');

/**
 * The rotating half of the headline: an agent's mark and its name.
 *
 * Occupies its own line at a fixed height, and each name is absolutely
 * positioned inside it. Nothing above or below can move no matter how wide the
 * name is, which is what stops "Codex" and "Claude Code" reflowing the headline
 * differently on a narrow screen.
 *
 * Cycling text is decoration on a single message, so the animated part is
 * hidden from assistive technology and the full list is exposed once as static
 * text. Under `prefers-reduced-motion` the cycle does not run; the sentence
 * names the category instead of flashing brands at someone who asked for
 * stillness.
 */
export function AgentRotator() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % AGENT_BRANDS.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [reduced]);

  if (reduced) {
    return <span className="text-accent-600 block">coding agent</span>;
  }

  const brand = AGENT_BRANDS[index] ?? AGENT_BRANDS[0];
  if (brand === undefined) return null;

  return (
    <span className="relative block h-[1.2em]">
      <span className="sr-only">{SPOKEN}</span>

      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={brand.name}
          aria-hidden
          initial={{ opacity: 0, y: '0.35em' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '-0.35em' }}
          transition={{ duration: DURATION.base, ease: EASE }}
          className="absolute inset-0 flex items-center gap-[0.28em] whitespace-nowrap"
        >
          <span className="bg-surface flex size-[0.92em] shrink-0 items-center justify-center overflow-hidden rounded-[0.2em]">
            <Image
              src={brand.logo}
              alt=""
              width={48}
              height={48}
              unoptimized
              className="size-full object-contain"
            />
          </span>
          <span className="text-accent-600">{brand.name}</span>
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

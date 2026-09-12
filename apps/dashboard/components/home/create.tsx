'use client';

import { motion, useReducedMotion } from 'motion/react';

import { DURATION, EASE } from '@/lib/motion';
import { FlowPanel } from './flow-panel';

/** The three things you do once, before an agent can spend anything. */
const STEPS = [
  {
    title: 'Name it',
    body: 'It gets a wallet immediately, and still cannot spend a cent until you say so.',
  },
  {
    title: 'Set the limits',
    body: 'How much a day, how much per purchase, which sellers it may pay — and a cap for a single job when a task deserves its own.',
  },
  {
    title: 'Hand it the job',
    body: 'One line points your agent at Pocket. Eight tools over MCP: it prices a call before buying it, reads what is left of its budget, and pulls its own receipts.',
  },
] as const;

/**
 * Setting up an agent, and what happens once one starts spending.
 *
 * The heading sits in the left column rather than above both, so the panel on
 * the right starts level with it instead of hanging below a full-width block.
 */
export function CreateAgent() {
  const reduced = useReducedMotion();
  const rise = (delay: number) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 16 },
    whileInView: reduced ? { opacity: 1 } : { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: DURATION.slow, ease: EASE, delay },
  });

  return (
    <section
      id="create"
      tabIndex={-1}
      className="mx-auto w-full max-w-[76rem] scroll-mt-28 px-5 py-16 outline-none sm:px-8"
    >
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
        <motion.div {...rise(0)}>
          <h2 className="text-text text-2xl font-bold tracking-tight sm:text-3xl">
            Hire an agent in under a minute
          </h2>
          <p className="text-text-secondary mt-3 leading-relaxed">
            You decide everything it is allowed to do before it does anything. After that you are
            watching, not approving.
          </p>

          <ol className="mt-7 flex flex-col gap-5">
            {STEPS.map((step, index) => (
              <motion.li
                key={step.title}
                initial={reduced ? { opacity: 0 } : { opacity: 0, x: -12 }}
                whileInView={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: DURATION.base, ease: EASE, delay: index * 0.09 }}
                className="flex gap-4"
              >
                <span
                  aria-hidden
                  className="border-border bg-accent-100 text-accent-700 flex size-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold"
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-text text-sm font-bold tracking-tight">{step.title}</h3>
                  <p className="text-text-secondary mt-1 text-sm leading-relaxed">{step.body}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </motion.div>

        <FlowPanel />
      </div>
    </section>
  );
}

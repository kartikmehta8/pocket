/**
 * What Pocket runs on, shown beside the sign-in control.
 */

import Image from 'next/image';

import { AgentRotator } from '@/components/home/agent-rotator';
import { INTEGRATIONS } from '@/lib/capabilities';
import { cn } from '@/lib/cn';

/** One vendor the sign-in screen names, and the one job it has. */
interface Vendor {
  name: string;
  /** Path under `public/`. */
  logo: string;
  role: string;
}

/**
 * Who holds the keys, where the money moves, and what it is denominated in.
 *
 * @remarks Names, logos and roles come from the same list the capabilities
 * page renders in full, so the sign-in screen cannot promise a vendor the
 * product no longer uses. USDC is added here rather than there: it is what
 * payments are denominated in, not a third party Pocket delegates to.
 */
const VENDORS: readonly Vendor[] = [
  ...INTEGRATIONS.map(({ name, logo, role }) => ({ name, logo, role })),
  { name: 'USDC', logo: '/logos/usdc.svg', role: 'Unit of account' },
];

/** Milliseconds between one mark appearing and the next, as the motion tokens set it. */
const STAGGER_MS = 45;

/**
 * What Pocket runs on, for someone who has not signed in yet.
 *
 * @param className Extra classes for the wrapper.
 * @remarks Two answers to the two questions an operator arrives with: will it
 * work with what I already run, and who is holding the money. The first is the
 * homepage's own rotating line, reused rather than restated, so the runtime
 * they came here with names itself. The second is a row of marks and nothing
 * else — no card, no border. These are other people's logos sitting on our
 * page, and boxing each one turns a quiet credit into a wall of buttons. Two
 * columns rather than a wrapping row, which strands the fourth mark alone on a
 * line of its own the moment the column narrows.
 *
 * The marks fade up in sequence on load, which is the only motion here beyond
 * the line above them.
 *
 * Rounded because one of these marks ships as a filled square and the rest are
 * circles; raw, it reads as the odd one out.
 */
export function TrustMarks({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-7', className)}>
      <div>
        <p className="text-text text-xl font-semibold tracking-tight">
          Works with
          <AgentRotator />
        </p>
        <p className="text-text-muted mt-1.5 text-xs leading-relaxed">
          And any other runtime that speaks MCP. One connection, no SDK to adopt.
        </p>
      </div>

      <div>
        <p className="eyebrow">Built on</p>
        <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4">
          {VENDORS.map((vendor, index) => (
            <li
              key={vendor.name}
              style={{ animationDelay: `${index * STAGGER_MS}ms` }}
              className="rise-in flex min-w-0 items-center gap-2.5"
            >
              <Image
                src={vendor.logo}
                alt=""
                width={64}
                height={64}
                unoptimized
                className="size-8 shrink-0 rounded-lg object-contain"
              />
              <span className="min-w-0">
                <span className="text-text block text-sm font-medium">{vendor.name}</span>
                <span className="text-text-muted text-2xs block leading-snug">{vendor.role}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

import { ArrowUpRight, BookOpen, Check, Receipt, ScrollText } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Meter } from '@/components/ui/meter';
import { cn } from '@/lib/cn';

import { STEPS, stepAnchor } from './steps';

/** Props for {@link ProgressRail}. */
export interface ProgressRailProps {
  /** Which steps are behind the operator, in order. */
  reached: boolean[];
  /** Where the documentation lives. */
  docsUrl: string;
}

/**
 * The run at a glance, beside the steps: how far it has got, which step is
 * next, and where the results show up once it is done.
 *
 * @remarks Every row is a link to its step, so a reader can jump to what is
 * outstanding without scrolling the whole guide. The states are written as
 * well as drawn, for a screen reader and for anyone who does not read colour.
 */
export function ProgressRail({ reached, docsUrl }: ProgressRailProps) {
  const total = reached.length;
  const done = reached.filter(Boolean).length;
  const next = reached.indexOf(false);

  return (
    <div className="flex flex-col gap-6 lg:sticky lg:top-20">
      <Card pop>
        <CardHeader>
          <div>
            <CardTitle>Progress</CardTitle>
            <CardDescription>
              {done === total
                ? 'Everything is connected.'
                : `${total - done} ${total - done === 1 ? 'step' : 'steps'} to go.`}
            </CardDescription>
          </div>
          <p className="figures text-text text-md shrink-0 font-semibold tracking-tight">
            {done}
            <span className="text-text-muted text-sm font-medium"> / {total}</span>
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Meter
            ratio={total === 0 ? 0 : done / total}
            label="Setup progress"
            valueText={`${done} of ${total} steps done`}
          />

          <ol className="flex flex-col">
            {STEPS.map((step, position) => {
              const state = reached[position] ? 'done' : position === next ? 'current' : 'todo';
              const Icon = step.icon;
              return (
                <li key={step.title}>
                  <Link
                    href={`#${stepAnchor(position + 1)}`}
                    className={cn(
                      'hover:bg-ash-25 -mx-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm',
                      'transition-colors duration-(--duration-fast) ease-(--ease-brand)',
                      state === 'current' ? 'text-text font-medium' : 'text-text-secondary',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-full border',
                        state === 'done'
                          ? 'border-border bg-success-soft text-success-ink'
                          : state === 'current'
                            ? 'border-border bg-accent-100 text-accent-700'
                            : 'border-divider bg-surface text-ash-400',
                      )}
                    >
                      {state === 'done' ? (
                        <Check className="size-3" strokeWidth={2.75} />
                      ) : (
                        <Icon className="size-3" strokeWidth={1.75} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{step.title}</span>
                    {state === 'done' ? (
                      <span className="sr-only">, done</span>
                    ) : state === 'current' ? (
                      <span className="text-2xs text-accent-700 shrink-0 font-medium">Next</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <Card pop>
        <CardHeader>
          <div>
            <CardTitle>Afterwards</CardTitle>
            <CardDescription>Where every purchase and refusal lands.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1">
            {[
              { href: '/payments', icon: Receipt, label: 'Payments', external: false },
              { href: '/audit', icon: ScrollText, label: 'Audit trail', external: false },
              { href: docsUrl, icon: BookOpen, label: 'Documentation', external: true },
            ].map(({ href, icon: Icon, label, external }) => (
              <li key={label}>
                <Link
                  href={href}
                  {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                  className="text-text-secondary hover:bg-ash-25 hover:text-text -mx-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors duration-(--duration-fast) ease-(--ease-brand)"
                >
                  <Icon aria-hidden className="text-ash-400 size-4 shrink-0" strokeWidth={1.75} />
                  <span className="flex-1">{label}</span>
                  {external ? (
                    <>
                      <span className="sr-only">(opens in a new tab)</span>
                      <ArrowUpRight aria-hidden className="text-ash-400 size-3.5" strokeWidth={2} />
                    </>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

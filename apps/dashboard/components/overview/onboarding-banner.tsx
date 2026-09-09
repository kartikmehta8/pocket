import Link from 'next/link';
import { ArrowRight, Bot, KeyRound, PlugZap } from 'lucide-react';

import { Button } from '@/components/ui/button';

/** What is still missing, in the order it has to be done. */
export interface OnboardingBannerProps {
  hasAgent: boolean;
  hasPolicy: boolean;
  hasPayment: boolean;
}

/** One line per outstanding step, resolved from live state. */
function nextStep(props: OnboardingBannerProps): { icon: typeof Bot; text: string } | null {
  if (!props.hasAgent) {
    return { icon: Bot, text: 'Register your first agent. Purse provisions its wallet.' };
  }
  if (!props.hasPolicy) {
    return {
      icon: KeyRound,
      text: 'Give it a budget and a policy. Until both exist it cannot spend anything.',
    };
  }
  if (!props.hasPayment) {
    return { icon: PlugZap, text: 'Point your agent runtime at the MCP server and buy something.' };
  }
  return null;
}

/**
 * A single prompt at the top of the overview while setup is incomplete.
 *
 * Shows one step, never a checklist: the reader is being asked to do the next
 * thing, not to audit everything they have not done. Disappears entirely once
 * an agent has settled a payment.
 *
 * @param props Which milestones the organization has reached.
 */
export function OnboardingBanner(props: OnboardingBannerProps) {
  const step = nextStep(props);
  if (step === null) return null;
  const { icon: Icon, text } = step;

  return (
    <div className="border-border bg-highlight-soft flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="border-border bg-surface text-accent-600 flex size-9 shrink-0 items-center justify-center rounded-md border">
          <Icon aria-hidden className="size-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-text text-sm font-medium">Finish setting up</p>
          <p className="text-text-secondary mt-0.5 text-sm leading-relaxed">{text}</p>
        </div>
      </div>
      <Button asChild>
        <Link href="/setup">
          Open setup
          <ArrowRight aria-hidden className="size-3.5" strokeWidth={2} />
        </Link>
      </Button>
    </div>
  );
}

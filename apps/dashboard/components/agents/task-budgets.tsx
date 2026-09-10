'use client';

import { Plus, Target } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState, useTransition } from 'react';

import { ActionFeedback } from '@/components/ui/action-feedback';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Meter } from '@/components/ui/meter';
import { IDLE_ACTION, type ActionState } from '@/lib/action-state';
import { closeTaskBudgetAction } from '@/lib/actions';
import { formatAmount, usageRatio } from '@/lib/format';
import { DURATION, EASE } from '@/lib/motion';
import type { TaskBudget } from '@/lib/types';

import { TaskBudgetDialog } from './task-budget-dialog';

/** Props for {@link TaskBudgets}. */
export interface TaskBudgetsProps {
  agentId: string;
  taskBudgets: TaskBudget[];
  defaultAsset: string;
}

/**
 * Task budgets with a remaining meter each. Closing one removes it from the
 * open list with an exit animation rather than a jump.
 */
export function TaskBudgets({ agentId, taskBudgets, defaultAsset }: TaskBudgetsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [state, setState] = useState<ActionState>(IDLE_ACTION);
  const [pending, startTransition] = useTransition();
  const reduced = useReducedMotion();

  return (
    <Card className="self-start">
      <CardHeader>
        <div>
          <CardTitle>Task budgets</CardTitle>
          <CardDescription>Ring-fenced allowances scoped to a single task.</CardDescription>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setDialogOpen(true)}>
          New
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {taskBudgets.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No task budgets"
            description="Open one to cap what an agent can spend on a single job."
            className="py-8"
          />
        ) : (
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {taskBudgets.map((budget) => (
                <motion.li
                  key={budget.id}
                  layout={!reduced}
                  exit={{ opacity: 0 }}
                  transition={{ duration: DURATION.base, ease: EASE }}
                  className="bg-ash-25 ring-border rounded-md px-3 py-2.5 ring-1 ring-inset"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-text truncate text-sm font-medium">{budget.label}</p>
                    <div className="flex shrink-0 items-center gap-2">
                      {budget.closedAt ? (
                        <Badge
                          tone="neutral"
                          hint="Closed budgets keep their history but can no longer be drawn against."
                        >
                          Closed
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              setState(await closeTaskBudgetAction(agentId, budget.id));
                            })
                          }
                        >
                          Close
                        </Button>
                      )}
                    </div>
                  </div>
                  <Meter
                    className="mt-2"
                    ratio={usageRatio(budget.spent, budget.limit)}
                    label={`${budget.label} budget used`}
                    valueText={`${formatAmount(budget.spent, null)} of ${formatAmount(budget.limit, budget.asset)} · ${formatAmount(budget.remaining, null)} remaining`}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
        <ActionFeedback state={state} />
      </CardContent>
      <TaskBudgetDialog
        agentId={agentId}
        defaultAsset={defaultAsset}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Card>
  );
}

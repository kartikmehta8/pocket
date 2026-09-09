/**
 * Presentation for policy decisions and audit actors.
 *
 * Split from `lib/status.ts`, and re-exported from it, so `@/lib/status`
 * remains the single import site for every status mapping.
 */

import { Ban, Bot, CircleCheck, Clock, Cpu, User } from 'lucide-react';

import type { AuditEvent, Outcome } from './types';
import type { StatusPresentation } from './status';

/**
 * Presentation for a policy decision outcome.
 *
 * @param outcome Decision outcome from the API.
 */
export function outcomePresentation(outcome: Outcome): StatusPresentation {
  switch (outcome) {
    case 'allow':
      return {
        tone: 'success',
        label: 'Allowed',
        Icon: CircleCheck,
        hint: 'Every rule passed and there is headroom in both budgets.',
      };
    case 'require_approval':
      return {
        tone: 'warning',
        label: 'Approval required',
        Icon: Clock,
        hint: 'Allowed in principle, but a person has to release it before anything is signed.',
      };
    case 'deny':
      return {
        tone: 'danger',
        label: 'Denied',
        Icon: Ban,
        hint: 'At least one rule failed. The violations list says which.',
      };
  }
}

/**
 * Presentation for the actor that produced an audit event.
 *
 * @param actorType Actor type from the API.
 */
export function actorPresentation(actorType: AuditEvent['actorType']): StatusPresentation {
  switch (actorType) {
    case 'agent':
      return {
        tone: 'info',
        label: 'Agent',
        Icon: Bot,
        hint: 'An autonomous agent initiated this, through the MCP server or the API.',
      };
    case 'human':
      return {
        tone: 'neutral',
        label: 'Human',
        Icon: User,
        hint: 'A signed-in person did this from the dashboard.',
      };
    case 'system':
      return {
        tone: 'neutral',
        label: 'System',
        Icon: Cpu,
        hint: 'Purse itself recorded this: a settlement confirmation, or a budget reset.',
      };
  }
}

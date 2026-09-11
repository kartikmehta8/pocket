/**
 * Presentation for the actor behind an audit event.
 *
 * Split from `lib/status.ts`, and re-exported from it, so `@/lib/status`
 * remains the single import site for every status mapping.
 */

import { Bot, Cpu, User } from 'lucide-react';

import type { AuditEvent } from './types';
import type { StatusPresentation } from './status';

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
        hint: 'Pocket itself recorded this: a settlement confirmation, or a budget reset.',
      };
  }
}

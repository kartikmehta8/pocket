import { humanize, truncateAddress } from './format';
import type { AuditEvent } from './types';

/** A non-empty string from a payload field, or `null`. */
function text(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

/** The strings in a payload list field, or none. */
function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

/** A URL without its scheme, which is noise in a table cell. */
function endpoint(url: string): string {
  return url.replace(/^https?:\/\//, '');
}

/** A transaction reference short enough for a cell; the panel has the whole thing. */
function shortRef(value: string): string {
  return value.length > 20 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
}

/**
 * Which agent an event is about, when it is about one.
 *
 * @param event The event.
 * @returns The agent id, or `null` for events about the organization or a key.
 * @remarks The id lives in a different place per family: budget and policy
 * changes make the agent the subject, a task budget names it in the payload,
 * and a payment names it as the actor. Reading all three is what makes the
 * agent column fill in across the trail rather than for one family.
 */
export function agentIdOf(event: AuditEvent): string | null {
  if (event.subjectType === 'agent' && event.subjectId) return event.subjectId;
  const named = text(event.payload['agentId']);
  if (named) return named;
  if (event.actorId?.startsWith('agent_')) return event.actorId;
  return null;
}

/**
 * One line saying what an event did, read from its payload.
 *
 * @param event The event.
 * @returns A short sentence fragment for the table. The raw payload is one
 *   click away, so this leaves things out rather than abbreviating them.
 * @remarks Every field is optional here. Payload shapes have changed before
 * and will again, and a row must never fail to render because an older event
 * lacks a key a newer one carries.
 */
export function describeEvent(event: AuditEvent): string {
  const payload = event.payload;
  const [family = '', verb = ''] = event.action.split('.');
  const amount = text(payload['amount']);
  const asset = text(payload['asset']);
  const money = amount ? [amount, asset].filter(Boolean).join(' ') : null;

  switch (family) {
    case 'payment': {
      const resource = text(payload['resource']);
      const recipient = text(payload['payTo']) ?? text(payload['recipient']);
      const target = resource ? endpoint(resource) : recipient ? truncateAddress(recipient) : null;
      const parts = [money, target].filter((part): part is string => part !== null);
      const join = (...tail: string[]) => [...parts, ...tail].join(' · ');
      switch (verb) {
        case 'blocked': {
          const violations = strings(payload['violations']);
          return join(violations.length > 0 ? violations.join(', ') : 'Refused by policy');
        }
        case 'awaiting_approval':
          return join('Held for approval');
        case 'approved':
          return join('Allowed by policy');
        case 'rejected':
          return join('Rejected by a person');
        case 'submitted': {
          const hash = text(payload['txHash']);
          return hash ? `Sent · ${shortRef(hash)}` : 'Sent to the network';
        }
        case 'settled': {
          const reference = text(payload['transactionId']) ?? text(payload['txHash']);
          return reference ? `Settled · ${shortRef(reference)}` : 'Settled';
        }
        case 'unconfirmed':
          return 'Sent, not yet confirmed';
        case 'failed': {
          const reason = text(payload['reason']);
          return reason && reason !== '{}' ? `Failed · ${reason}` : 'Failed before settlement';
        }
        default:
          return join() || humanize(verb);
      }
    }
    case 'agent': {
      const name = text(payload['name']);
      if (verb === 'created') return name ? `Registered "${name}"` : 'Registered';
      const status = text(payload['status']);
      return status ? `Status set to ${humanize(status)}` : 'Details updated';
    }
    case 'budget': {
      const daily = text(payload['dailyLimit']);
      const perPayment = text(payload['perTransactionLimit']);
      const parts = [
        daily ? `Daily ${[daily, asset].filter(Boolean).join(' ')}` : null,
        perPayment ? `per payment ${perPayment}` : null,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(' · ') : 'Budget saved';
    }
    case 'policy': {
      const categories = strings(payload['allowedCategories']);
      return categories.length > 0
        ? `Rules saved · ${categories.length} ${categories.length === 1 ? 'category' : 'categories'} allowed`
        : 'Rules saved';
    }
    case 'task_budget': {
      const label = text(payload['label']);
      const limit = text(payload['limit']);
      const head = label ? `"${label}"` : 'Task budget';
      if (verb === 'closed') return `${head} closed`;
      return limit ? `${head} · ${[limit, asset].filter(Boolean).join(' ')}` : head;
    }
    case 'api_key': {
      const label = text(payload['label']);
      const prefix = text(payload['prefix']);
      return [label, prefix ? `${prefix}…` : null].filter(Boolean).join(' · ') || humanize(verb);
    }
    case 'org': {
      if (verb === 'seeded') {
        const agent = text(payload['agent']);
        return agent ? `Demo data, with agent "${agent}"` : 'Demo data';
      }
      const name = text(payload['name']);
      return name ? `Named "${name}"` : humanize(verb);
    }
    case 'wallet': {
      const hash = text(payload['txHash']);
      return [asset ? `${asset} associated` : 'Token associated', hash ? shortRef(hash) : null]
        .filter(Boolean)
        .join(' · ');
    }
    default:
      return [humanize(event.subjectType), event.subjectId].filter(Boolean).join(' ');
  }
}

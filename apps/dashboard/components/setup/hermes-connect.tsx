'use client';

/**
 * Connection recipes for the MCP server.
 */

import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { useState } from 'react';

import { cn } from '@/lib/cn';
import { ConfirmStepButton } from './confirm-step-button';
import { CodeBlock } from '@/components/ui/code-block';

/** The runtimes an operator is most likely to point at Pocket. */
const CLIENTS = ['Hermes', 'Claude Code', 'Raw JSON'] as const;

type Client = (typeof CLIENTS)[number];

/** Stand-in shown until a key is created, so the shape of one is obvious. */
const KEY_PLACEHOLDER = 'pocket_sk_...';

/**
 * Renders the connection recipe for one client.
 *
 * @param client Which runtime.
 * @param url The MCP endpoint.
 * @param apiKey The organization key the runtime will present.
 * @returns The exact text to run or paste.
 */
function recipe(client: Client, url: string, apiKey: string): { caption: string; code: string } {
  const authorization = `Bearer ${apiKey}`;
  switch (client) {
    case 'Hermes':
      return {
        caption: 'Terminal',
        code: `hermes mcp add pocket --transport http --url ${url} \\\n  --header "Authorization: ${authorization}"`,
      };
    case 'Claude Code':
      return {
        caption: 'Terminal',
        code: `claude mcp add --transport http pocket ${url} \\\n  --header "Authorization: ${authorization}"`,
      };
    case 'Raw JSON':
      return {
        caption: 'mcp.json',
        code: JSON.stringify(
          {
            mcpServers: {
              pocket: { type: 'http', url, headers: { Authorization: authorization } },
            },
          },
          null,
          2,
        ),
      };
  }
}

/** Props for {@link HermesConnect}. */
export interface HermesConnectProps {
  /** The MCP endpoint this organization should connect to. */
  url: string;
  /**
   * The key created in the step above, or `null` when this visit has not
   * created one.
   *
   * @remarks A key created on an earlier visit cannot be shown again; only a
   * hash of it is kept. The command then carries a placeholder and says so.
   */
  apiKey: string | null;
  /** Whether the step above is complete, which is what unlocks this one. */
  ready: boolean;
  /** Whether the operator has already confirmed the runtime is attached. */
  done: boolean;
  /** Called when they confirm it. */
  onDone: () => void;
}

/**
 * Connection recipes for the MCP server, one tab per runtime.
 *
 * The runtime presents the organization key on every call; the MCP server
 * stores none of its own, so the hosted endpoint cannot reach an organization
 * whose key the caller does not already hold. The key travels in a transport
 * header rather than in the conversation, so the model still never sees it and
 * cannot leak it in a completion.
 *
 * Whether the command was actually run happens in somebody's terminal, which
 * Pocket cannot see, so this step is confirmed rather than verified. Guessing
 * from payment records only ever produced false negatives.
 *
 * @param props The MCP endpoint, the key from the step above, and whether the
 *   step is unlocked or behind us.
 */
export function HermesConnect({ url, apiKey, ready, done, onDone }: HermesConnectProps) {
  const [client, setClient] = useState<Client>('Claude Code');
  const { caption, code } = recipe(client, url, apiKey ?? KEY_PLACEHOLDER);

  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup.Root
        type="single"
        value={client}
        onValueChange={(next) => {
          if (next !== '') setClient(next as Client);
        }}
        aria-label="Agent runtime"
        className="border-border bg-ash-100 inline-flex w-fit gap-0.5 rounded-md border p-0.5"
      >
        {CLIENTS.map((option) => (
          <ToggleGroup.Item
            key={option}
            value={option}
            className={cn(
              'cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium',
              'transition-colors duration-(--duration-fast) ease-(--ease-brand)',
              'text-text-secondary hover:text-text',
              'data-[state=on]:bg-surface data-[state=on]:text-text data-[state=on]:shadow-e1',
            )}
          >
            {option}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>

      <CodeBlock code={code} label={`${client} MCP configuration`} caption={caption} />

      <p className="text-text-muted text-xs leading-relaxed">
        {apiKey !== null
          ? 'Your new key is already in the command. Nothing to copy between boxes.'
          : ready
            ? `Your key is filled in the moment you create one above. For a key from an earlier visit, put it in place of ${KEY_PLACEHOLDER}; Pocket keeps only a hash and cannot show it again.`
            : 'Create a key in step five and it is filled in here.'}
      </p>

      {done ? null : (
        <ConfirmStepButton
          variant="secondary"
          ready={ready}
          onDone={onDone}
          hint="Run it in your terminal, then mark the step done."
          blocked="Unlocks once step five is done."
        />
      )}
    </div>
  );
}

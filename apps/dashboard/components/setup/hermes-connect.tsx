'use client';

import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { useId, useState } from 'react';

import { cn } from '@/lib/cn';
import { CodeBlock } from '@/components/ui/code-block';
import { Field, Input } from '@/components/ui/field';

/** The runtimes an operator is most likely to point at Pocket. */
const CLIENTS = ['Hermes', 'Claude Code', 'Raw JSON'] as const;

type Client = (typeof CLIENTS)[number];

/** Stand-in shown until a key is pasted, so the shape of one is obvious. */
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

/**
 * Connection recipes for the MCP server, one tab per runtime.
 *
 * The runtime presents the organization key on every call; the MCP server
 * stores none of its own, so the hosted endpoint cannot reach an organization
 * whose key the caller does not already hold. The key travels in a transport
 * header rather than in the conversation, so the model still never sees it and
 * cannot leak it in a completion.
 *
 * @param url The MCP endpoint this organization should connect to.
 */
export function HermesConnect({ url }: { url: string }) {
  const [client, setClient] = useState<Client>('Claude Code');
  const [apiKey, setApiKey] = useState('');
  const keyId = useId();
  const { caption, code } = recipe(
    client,
    url,
    apiKey.trim() === '' ? KEY_PLACEHOLDER : apiKey.trim(),
  );

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

      <Field
        htmlFor={keyId}
        label="Your API key"
        hint="Paste the key from the step above to fill it into the command. It is only used here, in your browser."
      >
        <Input
          id={keyId}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder={KEY_PLACEHOLDER}
          spellCheck={false}
          autoComplete="off"
          className="font-mono"
        />
      </Field>

      <CodeBlock code={code} label={`${client} MCP configuration`} caption={caption} />
    </div>
  );
}

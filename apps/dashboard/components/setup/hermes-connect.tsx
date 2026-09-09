'use client';

import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { useState } from 'react';

import { cn } from '@/lib/cn';
import { CodeBlock } from '@/components/ui/code-block';

/** The runtimes an operator is most likely to point at Pocket. */
const CLIENTS = ['Hermes', 'Claude Code', 'Raw JSON'] as const;

type Client = (typeof CLIENTS)[number];

/**
 * Renders the connection recipe for one client.
 *
 * @param client Which runtime.
 * @param url The MCP endpoint.
 * @returns The exact text to run or paste.
 */
function recipe(client: Client, url: string): { caption: string; code: string } {
  const config = JSON.stringify({ mcpServers: { pocket: { type: 'http', url } } }, null, 2);
  switch (client) {
    case 'Hermes':
      return { caption: 'Terminal', code: `hermes mcp add pocket --transport http --url ${url}` };
    case 'Claude Code':
      return { caption: 'Terminal', code: `claude mcp add --transport http pocket ${url}` };
    case 'Raw JSON':
      return { caption: 'mcp.json', code: config };
  }
}

/**
 * Connection recipes for the MCP server, one tab per runtime.
 *
 * No API key appears in any of them. The MCP server holds the organization
 * credential and never passes it to the model, which is the whole point: an
 * agent that cannot read the key cannot leak it in a completion.
 *
 * @param url The MCP endpoint this organization should connect to.
 */
export function HermesConnect({ url }: { url: string }) {
  const [client, setClient] = useState<Client>('Hermes');
  const { caption, code } = recipe(client, url);

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
    </div>
  );
}

/**
 * Remote MCP server.
 *
 * Speaks Streamable HTTP so an agent runtime can attach over the network. Each
 * request gets its own server, transport and API client, which keeps callers
 * isolated from one another.
 *
 * The credential travels with the request. This server holds no key of its
 * own, so an unauthenticated caller can reach nothing: whoever connects
 * presents their own organization key and sees only that organization.
 *
 * `loadEnvFile()` runs before the first configuration read. `tsx` does not read
 * `.env`, so without it a service keeps whatever environment its shell had when
 * it started.
 */

import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { PocketClient } from './client.js';
import { registerTools, toolCatalog } from './tools.js';
import { loadEnvFile } from '@pocket/core/env';
import { release } from '@pocket/core/release';

loadEnvFile();

/**
 * Reads a variable, treating a blank one as unset.
 *
 * `??` only falls back on undefined, so `MCP_PORT=` would be read as the empty
 * string and become port 0. A variable left blank in a `.env` means "use the
 * default", so that is what it does here.
 *
 * @param name - Variable to read.
 * @param fallback - Value to use when it is missing or blank.
 * @returns The configured value, or the fallback.
 */
function envOr(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? fallback : value;
}

/**
 * Extracts the organization key from an `Authorization` header.
 *
 * @param header - Raw header value, if the caller sent one.
 * @returns The bearer token, or `null` when the header is absent or malformed.
 * @remarks The scheme is matched case-insensitively because HTTP does not
 *   promise a spelling, and clients differ.
 */
function bearerToken(header: string | undefined): string | null {
  if (header === undefined) return null;
  const match = /^bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token === undefined || token === '' ? null : token;
}

const port = Number(envOr('MCP_PORT', '8081'));
const baseUrl = envOr('POCKET_API_URL', 'http://localhost:8080');

/**
 * The address an agent runtime is told to connect to.
 *
 * Not necessarily the address this process bound: behind a proxy the two
 * differ, and the snippets on the home route are meant to be pasted somewhere
 * else.
 */
const publicUrl = envOr('MCP_PUBLIC_URL', `http://localhost:${String(port)}/mcp`);

/** Version reported on the home route. Matches `package.json`. */
const VERSION = '0.1.0';

/**
 * The published tool catalogue, derived once.
 *
 * The registration it runs is identical on every call, and the home route is
 * the kind of endpoint a monitor hits on a schedule.
 */
const TOOLS = toolCatalog();

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_request, response) => {
  response.json({ ok: true, api: baseUrl, transport: 'streamable-http', auth: 'bearer' });
});

/**
 * What this service is, served from its own front door.
 *
 * `GET /` answered 404, which tells a visitor nothing: an MCP endpoint is a
 * URL someone pastes into a configuration file, and the one thing they cannot
 * do with it beforehand is look at it. So it describes itself — the transport,
 * the credential it wants, every tool it offers and which of them can spend —
 * without a key, because none of that belongs to an organization.
 *
 * The tools are listed from the same registration the protocol serves, so the
 * page cannot advertise a tool that is not there.
 *
 * `no-store`, because uptime and the running build change under the reader's
 * feet and an intermediary holding a copy would answer confidently with
 * yesterday's.
 */
app.get('/', (_request, response) => {
  response.set('cache-control', 'no-store').json({
    service: 'pocket-mcp',
    name: 'Pocket MCP server',
    summary: 'Lets an AI agent spend real money inside limits a human set.',
    description:
      'Pocket gives each agent its own wallet and a hard cap it cannot raise. This server is ' +
      'how an agent reaches it: one tool buys things, and the other seven exist so the agent ' +
      'does not have to guess what it is allowed to do before it tries.',
    role: 'Protocol adapter. It holds no state and no key of its own; every call is forwarded to the Pocket API as whoever presented the credential.',
    protocol: {
      name: 'Model Context Protocol',
      transport: 'streamable-http',
      endpoint: { method: 'POST', path: '/mcp', url: publicUrl },
    },
    auth: {
      scheme: 'Bearer',
      header: 'Authorization: Bearer pocket_sk_…',
      credential: 'An organization API key, minted in the Pocket dashboard.',
      note: 'The key travels as a transport header. It is never passed to the model, never returned in a tool result, and never written into the context.',
    },
    tools: TOOLS,
    connect: {
      hermes: `hermes mcp add pocket --transport http --url ${publicUrl} --header "Authorization: Bearer pocket_sk_..."`,
      claudeCode: `claude mcp add --transport http pocket ${publicUrl} --header "Authorization: Bearer pocket_sk_..."`,
      config: {
        mcpServers: {
          pocket: {
            type: 'http',
            url: publicUrl,
            headers: { Authorization: 'Bearer pocket_sk_...' },
          },
        },
      },
    },
    links: {
      product: 'https://www.pocket-app.xyz',
      documentation: 'https://docs.pocket-app.xyz/docs/using/creating-an-agent',
      protocol: 'https://modelcontextprotocol.io',
      health: '/health',
    },
    release: release(VERSION),
  });
});

/**
 * Handles one MCP request.
 *
 * @remarks A fresh {@link McpServer}, transport and {@link PocketClient} per
 * request means no state and no credential leaks between callers. The cost is
 * per-request setup, which is negligible next to the network calls each tool
 * makes.
 *
 * A missing credential is answered `401` with a `WWW-Authenticate` challenge,
 * so a client that can prompt for one knows what to ask for instead of
 * reporting an opaque failure.
 */
app.post('/mcp', (request, response) => {
  void (async () => {
    const apiKey = bearerToken(request.get('authorization'));
    if (apiKey === null) {
      response
        .status(401)
        .set('WWW-Authenticate', 'Bearer realm="pocket"')
        .json({
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message:
              'Missing credential. Connect with an Authorization: Bearer <pocket_sk_...> header, using an API key minted in the Pocket dashboard.',
          },
          id: null,
        });
      return;
    }

    const server = new McpServer({ name: 'pocket', version: '0.1.0' });
    registerTools(server, new PocketClient({ baseUrl, apiKey }));

    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    response.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(request, response, request.body);
    } catch (cause) {
      process.stderr.write(`MCP request failed: ${String(cause)}\n`);
      if (!response.headersSent) {
        response.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  })();
});

/**
 * Answers the transport's other verbs rather than leaving them to 404.
 *
 * Streamable HTTP in stateless mode has no server-initiated stream to open and
 * no session to end, so `GET` and `DELETE` on the endpoint are method errors
 * rather than missing routes.
 */
for (const method of ['get', 'delete'] as const) {
  app[method]('/mcp', (_request, response) => {
    response.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'This server is stateless. Use POST /mcp.' },
      id: null,
    });
  });
}

app.listen(port, () => {
  process.stdout.write(`Pocket MCP server listening on http://localhost:${port}/mcp\n`);
});

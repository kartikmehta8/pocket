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
 */

import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { PocketClient } from './client.js';
import { registerTools } from './tools.js';

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

const app = express();
// Behind a reverse proxy the socket address is the proxy's, so without this
// every agent looks like it came from the same client.
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_request, response) => {
  response.json({ ok: true, api: baseUrl, transport: 'streamable-http', auth: 'bearer' });
});

/**
 * Handles one MCP request.
 *
 * @remarks A fresh {@link McpServer}, transport and {@link PocketClient} per
 * request means no state and no credential leaks between callers. The cost is
 * per-request setup, which is negligible next to the network calls each tool
 * makes.
 */
app.post('/mcp', (request, response) => {
  void (async () => {
    const apiKey = bearerToken(request.get('authorization'));
    if (apiKey === null) {
      // 401 with the challenge, so a client that can prompt for a credential
      // knows what to ask for instead of reporting an opaque failure.
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

// Streamable HTTP in stateless mode has no server-initiated stream to open and
// no session to end, so these verbs are answered rather than left to 404.
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

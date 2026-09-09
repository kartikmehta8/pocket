/**
 * Remote MCP server.
 *
 * Speaks Streamable HTTP so an agent runtime can attach over the network. Each
 * request gets its own server and transport instance, which keeps sessions
 * isolated from one another.
 */

import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { PurseClient } from './client.js';
import { registerTools } from './tools.js';

const port = Number(process.env['MCP_PORT'] ?? 8081);
const baseUrl = process.env['PURSE_API_URL'] ?? 'http://localhost:8080';
const apiKey = process.env['MCP_AGENT_TOKEN'] ?? '';

if (apiKey === '') {
  process.stderr.write(
    'MCP_AGENT_TOKEN is not set. Create an organization with POST /v1/orgs and put its apiKey in .env.\n',
  );
  process.exit(1);
}

const client = new PurseClient({ baseUrl, apiKey });
const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_request, response) => {
  response.json({ ok: true, api: baseUrl, transport: 'streamable-http' });
});

/**
 * Handles one MCP request.
 *
 * @remarks A fresh {@link McpServer} and transport per request means no state
 * leaks between callers. The cost is per-request setup, which is negligible
 * next to the network calls each tool makes.
 */
app.post('/mcp', (request, response) => {
  void (async () => {
    const server = new McpServer({ name: 'purse', version: '0.1.0' });
    registerTools(server, client);

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
  process.stdout.write(`Purse MCP server listening on http://localhost:${port}/mcp\n`);
});

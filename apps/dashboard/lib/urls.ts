import 'server-only';

/** Where the MCP server is reachable when nothing else is configured. */
const DEFAULT_MCP_URL = 'http://localhost:8081/mcp';

/** Where the docs site runs in a local checkout. */
const DEFAULT_DOCS_URL = 'http://localhost:3001/docs';

/**
 * Public URLs an operator has to paste into another tool.
 *
 * These are read from the server environment rather than derived from the
 * request, because the address a browser used to reach the dashboard is not
 * necessarily the address an agent runtime can reach the MCP server on.
 */
export interface ServiceUrls {
  /** Streamable-HTTP endpoint an MCP client connects to. */
  mcp: string;
  /** Base URL of the Pocket API. */
  api: string;
  /** The example paid resource, when one is deployed. */
  paidService: string | null;
  /** The documentation site. */
  docs: string;
}

/**
 * Resolves the URLs shown on the setup screen.
 *
 * @returns Each service address, without a trailing slash.
 */
export function serviceUrls(): ServiceUrls {
  const trim = (value: string): string => value.replace(/\/+$/, '');
  const paid = process.env.NEXT_PUBLIC_PAID_SERVICE_URL ?? '';
  return {
    mcp: process.env.NEXT_PUBLIC_MCP_URL ?? DEFAULT_MCP_URL,
    api: trim(process.env.POCKET_API_URL ?? 'http://localhost:8080'),
    paidService: paid === '' ? null : trim(paid),
    docs: trim(process.env.NEXT_PUBLIC_DOCS_URL ?? DEFAULT_DOCS_URL),
  };
}

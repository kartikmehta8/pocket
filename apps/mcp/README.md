# `@pocket/mcp`

How an agent reaches Pocket.

A Model Context Protocol server over Streamable HTTP. Eight tools: one can spend
money, and the other seven exist so the agent does not have to guess what it is
allowed to do before it tries.

## Run it

```bash
pnpm --filter @pocket/mcp dev
```

[`mcp.pocket-app.xyz/mcp`](https://mcp.pocket-app.xyz/mcp) is the hosted
endpoint, and the local server answers on `:8081`. Either describes itself at
`/`: the transport, the credential it wants, and every tool with whether that
tool can spend.

## Connect an agent

```bash
hermes mcp add pocket --transport http --url https://mcp.pocket-app.xyz/mcp \
  --header "Authorization: Bearer pocket_sk_..."
```

```bash
claude mcp add --transport http pocket https://mcp.pocket-app.xyz/mcp \
  --header "Authorization: Bearer pocket_sk_..."
```

Any other MCP client takes the same endpoint and header. Point it at
`http://localhost:8081/mcp` to drive a server you are running yourself.

The endpoint holds no credential of its own. Every caller presents its own
organization key, so the hosted address cannot reach an organization the caller
does not already have a key for.

## The tools

| Tool                        | Does                                     | Spends |
| --------------------------- | ---------------------------------------- | ------ |
| `pocket_pay_for_resource`   | Buys something and returns the content   | Yes    |
| `pocket_preview_payment`    | Asks whether a purchase would be allowed | No     |
| `pocket_create_task_budget` | Opens a ring-fenced amount for one job   | No     |
| `pocket_list_agents`        | Every agent, with budget and spend today | No     |
| `pocket_get_agent`          | One agent, with its limits and balance   | No     |
| `pocket_spend_summary`      | Spend by category and recipient          | No     |
| `pocket_list_payments`      | Recent attempts, refusals included       | No     |
| `pocket_audit_trail`        | The full record                          | No     |

Every tool returns JSON as text, and a failure comes back as a tool result
rather than a thrown error. An agent that is told why it was refused can pick
something cheaper; one that gets an exception retries the same thing.

## The credential never reaches the model

This server holds no key of its own. Whoever connects presents their own
organization key, and sees only that organization.

The key travels as a transport header, set once in your runtime's configuration.
It is never passed to the model, never returned in a tool result, and never
written into the context. A model that cannot read it cannot leak it.

Each request gets its own server, transport and API client, so no state and no
credential crosses between callers.

## Configuration

| Variable         | Default                     | What it is                          |
| ---------------- | --------------------------- | ----------------------------------- |
| `MCP_PORT`       | `8081`                      | Port to bind                        |
| `POCKET_API_URL` | `http://localhost:8080`     | The API this forwards to            |
| `MCP_PUBLIC_URL` | `http://localhost:8081/mcp` | The address printed in the snippets |

`MCP_PUBLIC_URL` matters behind a proxy, where the address an agent connects to
is not the address this process bound.

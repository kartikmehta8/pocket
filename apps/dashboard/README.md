# `@pocket/dashboard`

Where a human sets the limits and reads the record.

Next.js App Router, React 19, server components by default. Also serves the
marketing page at `/`.

## Run it

```bash
pnpm dev:dashboard
```

`http://localhost:3000`. Sign in and the setup guide walks you from an empty
organization to an agent that has paid for its own data.

## The screens

| Route           | What it answers                                                     |
| --------------- | ------------------------------------------------------------------- |
| `/dashboard`    | What was spent this week, and what was refused                      |
| `/agents`       | Every agent holding a wallet, with today's spend against its budget |
| `/agents/[id]`  | The limits themselves: budget, policy, task budgets, funding        |
| `/payments`     | Every attempt, filterable, refusals tinted and expandable           |
| `/audit`        | Every actor and every action, newest first                          |
| `/marketplace`  | Buy from the example seller without connecting an agent             |
| `/capabilities` | The eight MCP tools, and prompts filled in with your own agent      |
| `/setup`        | Seven steps, reading live state rather than a checkbox              |
| `/settings`     | Organization, API keys, and the addresses agents connect to         |

## How it talks to the API

Through `lib/http.ts`, which is `import 'server-only'`. The browser never calls
the Pocket API: this app's own server does, carrying the signed-in person's
token. The API needs no public hostname and no CORS entry for a browser.

A call never throws. Every result is `{ ok: true, data }` or
`{ ok: false, code, message }`, so a failing panel degrades instead of taking
the page down with it.

## Design

Light mode only, defined once in `app/globals.css`. Three things carry the look
and every component honours all three: a warm off-white canvas, a true-black
hairline around anything that is a surface or a control, and generous 1rem
radii. Shadows are nearly absent — the border does the separating.

Tailwind v4, tokens in `@theme`. Note that theme variables are tree-shaken
unless a literal class name references them, so a computed
`bg-series-${n}` paints nothing. Chart hues are written out in full for that
reason.

## Layout

| Path            | What is in it                                           |
| --------------- | ------------------------------------------------------- |
| `app/(app)`     | Signed-in routes, behind the navigation rail            |
| `app/page.tsx`  | The marketing page                                      |
| `components`    | Grouped by feature, plus `ui` for the shared primitives |
| `lib`           | API client, server actions, formatting, domain helpers  |
| `middleware.ts` | Who may reach what, signed in or not                    |

## Configuration

| Variable                       | What it is                                          |
| ------------------------------ | --------------------------------------------------- |
| `POCKET_API_URL`               | The API, reachable from this server                 |
| `NEXT_PUBLIC_PRIVY_APP_ID`     | Sign-in                                             |
| `NEXT_PUBLIC_MCP_URL`          | Printed on the setup and settings screens           |
| `NEXT_PUBLIC_PAID_SERVICE_URL` | The seller the marketplace lists                    |
| `NEXT_PUBLIC_DOCS_URL`         | Where the Documentation link goes                   |
| `NEXT_PUBLIC_APP_DOMAIN`       | The domain in canonical links and preview cards     |
| `POCKET_API_KEY`               | **Leave empty.** Set, it bypasses sign-in entirely. |

Setting `POCKET_API_KEY` pins the whole dashboard to one organization. That is a
local single-tenant demo, never a deployment.

## Tests

```bash
pnpm --filter @pocket/dashboard test
```

Vitest with `renderToStaticMarkup`, so a server component can be asserted on
without a browser.

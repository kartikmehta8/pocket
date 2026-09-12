# `@pocket/docs`

The documentation site. Fumadocs on Next.js, content in MDX.

## Run it

```bash
pnpm --filter @pocket/docs dev
```

The published site is
[docs.pocket-app.xyz/docs](https://docs.pocket-app.xyz/docs); the local one
answers on `:3001`.

Note that link navigation reloads the page in development. That is the dev
server, not the site; the production build navigates client-side, which is what
the sidebar's sliding marker needs.

## Writing a page

Add an `.mdx` file under `content/docs`, then list it in `meta.json`. The
sidebar, the search index, the sitemap and the social cards all come from that
one list, so a page cannot appear in one and be missing from another.

```mdx
---
title: Setting up a budget
description: Five limits, all off by default, and what each one stops.
---
```

The description is not decoration. It becomes the page summary, the search
result and the line on the preview card.

## Components you can use without importing

| Component          | For                                             |
| ------------------ | ----------------------------------------------- |
| `<Shot>`           | A screenshot, framed and click-to-zoom          |
| `<Flow>`           | Boxes in a row, for a sequence of states        |
| `<Sequence>`       | Who asks whom, for an exchange between services |
| `<Callout>`        | An aside worth stopping for                     |
| `<Steps>` `<Step>` | A numbered walkthrough                          |
| `<Tabs>` `<Tab>`   | The same instruction for different tools        |
| `<Cards>` `<Card>` | Links onward                                    |

## Screenshots

`public/screens`, captured at 1440×900 on a 2× display. They are real captures
of a running dashboard with testnet money in it.

Service addresses in them read `seller.example.com` rather than a loopback port,
because a reader of the documentation is looking at a deployed product.

## Social cards

`/og/<slug>` renders one card per page at build time, in the product's own
materials. It is a route handler rather than the `opengraph-image` file
convention: that convention is a route segment, and Next refuses one after the
optional catch-all this route is.

## Configuration

| Variable                  | What it is                                       |
| ------------------------- | ------------------------------------------------ |
| `NEXT_PUBLIC_APP_URL`     | Where "Open the app" goes                        |
| `NEXT_PUBLIC_DOCS_DOMAIN` | The domain in canonical links, sitemap and cards |

Both are inlined at build time. Setting either at run time is too late.

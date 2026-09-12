# Contributing

Thanks for looking. This is a small codebase with strong opinions; most of them
are enforced automatically, so the fastest way to find out whether a change fits
is to run the checks.

## Before you push

```bash
pnpm verify
```

That is formatting, lint, typecheck, tests and a full build. CI runs the same
thing, so a green `verify` is a green pipeline. A pre-commit hook runs the first
three on every commit; `git commit --no-verify` skips it when you need to.

## What the checks expect

| Check  | Command          | What it means                                       |
| ------ | ---------------- | --------------------------------------------------- |
| Format | `pnpm format`    | Prettier owns layout. Never argue with it by hand.  |
| Lint   | `pnpm lint`      | ESLint, plus Next's own rules inside the dashboard. |
| Types  | `pnpm typecheck` | No `any`, no unchecked casts, strict everywhere.    |
| Tests  | `pnpm test`      | Vitest. The API suite needs Postgres on 5434.       |

## House style

**Comments explain why, not what.** Every file opens with a doc comment saying
what it is for. Every exported function carries one with `@param`, `@returns`
and `@throws` where it can throw. There are no inline comments: if a line needs
one, the line needs a better name instead.

**Money is a decimal string beside its asset.** Never a JavaScript number. A
float in a ledger is a bug waiting for a rounding error, and every serialiser in
`apps/api/src/serialize.ts` exists to keep it that way.

**Decisions happen before signatures.** Nothing signs a payment until the policy
engine has allowed it. A refusal is recorded, with the rule that stopped it and
the room that was left, rather than dropped.

**Nothing reaches for a vendor directly.** Privy, Hedera and The Graph all sit
behind ports in `packages/core/src/ports.ts`, implemented in
`packages/adapters`. Domain code depends on the port.

## Commits

Conventional Commits, enforced by a hook:

```
feat(dashboard): show spend by category as a composition
fix(api): release the reservation when settlement fails
docs: explain the x402 handshake
```

Types: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci`
`chore` `revert`. Scope is optional and lowercase. Subject is imperative and 72
characters or fewer.

The body is where the reasoning goes. Say what was wrong and why this fixes it,
not what the diff already shows.

## Tests

Anything that touches money, a policy decision or an authorisation boundary
needs a test before it merges. Everything else is judgement.

```bash
pnpm test                              # everything
pnpm --filter @pocket/api test         # one workspace
pnpm --filter @pocket/core test -- -t budget
```

## Licence

Contributions are accepted under the [Business Source License 1.1](LICENSE) that
covers the rest of the project.

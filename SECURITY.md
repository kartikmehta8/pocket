# Security

Pocket holds spending authority for autonomous agents. A flaw here is a flaw
that spends someone's money, so please treat one as sensitive.

## Reporting a vulnerability

**Do not open a public issue.**

Use [GitHub's private vulnerability reporting](https://github.com/kartikmehta8/pocket/security/advisories/new)
on this repository. That reaches the maintainer directly and keeps the report
private until there is a fix.

Please include what you can: what you did, what happened, and what you expected.
A proof of concept helps enormously; it does not have to be polished.

You will get a first response within three working days. If a report is valid,
you will hear what the fix is and when it ships, and you will be credited in the
advisory unless you would rather not be.

## What is in scope

Anything that lets one of these go wrong:

- A payment settles that the policy engine should have refused.
- An agent changes its own budget, policy or status.
- One organization reads or touches another organization's data.
- An API key, identity token or signing credential is exposed, logged, or
  returned to a model.
- The audit trail can be edited, deleted, or made to disagree with what happened.
- A price is accepted from a source the deployment did not configure.

## What is not

- The example seller in `apps/paid-service`. It is a demonstration counterparty
  and holds nothing worth taking.
- Anything requiring an already-compromised host, database, or vendor account.
- Vulnerabilities in Privy, Hedera or The Graph themselves. Report those to them;
  tell us too if Pocket makes them worse.
- Missing hardening with no exploit behind it, such as a header a scanner wanted.

## How the design limits the damage

Worth knowing before you report, because two of these surprise people:

**Pocket holds no private key.** Wallets are custodied by Privy and only a
signature ever crosses back. There is nothing in the database or in a log line
that could sign a transfer.

**Pocket never broadcasts.** It produces a partly signed transaction that a
facilitator has to co-sign, so a fully compromised Pocket still cannot move money
on its own.

**A refused payment was never signed.** The decision runs first, so there is no
signed payload sitting around for a later request to replay.

**An agent's credential never reaches the model.** It travels as a transport
header to the MCP server and is never returned in a tool result.

## Running it yourself

Keep `POCKET_API_KEY` unset on any deployment with real users. Setting it
bypasses sign-in and pins the whole dashboard to a single organization; it
exists for a local single-tenant demo and nothing else.

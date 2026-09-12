# Hedera — settlement and balance reads

Pocket talks to Hedera through its Ethereum-compatible JSON-RPC relay, so this
is ordinary EVM wiring: chain id 296 on testnet, `0x` addresses, `eth_call`.

Part of [setup](README.md). Independent of [Privy](privy.md) and
[The Graph](the-graph.md).

## `HEDERA_RPC_URL`

This is a public endpoint, not a key. Nothing to sign up for:

```bash
HEDERA_RPC_URL=https://testnet.hashio.io/api
CHAIN=hedera-testnet
```

Hashio is Hashgraph's free relay and is explicitly **for development and
testing only**; it is rate limited. For anything sustained, use a commercial
relay (Hgraph, Validation Cloud, QuickNode) or self-host the
[Hiero JSON-RPC Relay](https://github.com/hiero-ledger/hiero-json-rpc-relay).
Those providers put the key inside the URL, so it still goes in this one
variable and there is no separate key setting.

Confirm the endpoint answers with the chain you expect:

```bash
curl -s -X POST https://testnet.hashio.io/api \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
# {"result":"0x128"}   0x128 = 296 = Hedera testnet
```

Mainnet is `https://mainnet.hashio.io/api`, chain id 295.

You also want a funded testnet account of your own for the faucet and for
HashScan: create one at **https://portal.hedera.com/dashboard**.

## `HEDERA_USDC_ADDRESS`

**Leave this blank unless you specifically want USDC.** Blank means Pocket
settles in HBAR, the native asset, which needs no contract address and no
setup. For a demo that is the path of least resistance. If it is blank and an
agent tries to pay in USDC, the payment fails with `VALIDATION_FAILED` rather
than guessing an address.

If you do want USDC, the value is Circle's testnet USDC, expressed as an EVM
address:

```bash
HEDERA_USDC_ADDRESS=0x0000000000000000000000000000000000068cda
```

That is Hedera token `0.0.429274`. Hedera tokens have two names for the same
thing: a native token id and an EVM address that is just the token number in
hex, left-padded to 20 bytes. `429274` is `0x68cda`, hence the address above.

To derive it for any other token:

```bash
python3 -c "print('0x' + format(429274, '040x'))"
```

Verify any address before trusting it, by asking the token itself:

```bash
curl -s -X POST https://testnet.hashio.io/api -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"0x0000000000000000000000000000000000068cda","data":"0x95d89b41"},"latest"]}'
# decodes to "USDC";  swap data for 0x313ce567 to get decimals (6)
```

Or read the token record straight from the mirror node:

```bash
curl -s https://testnet.mirrornode.hedera.com/api/v1/tokens/0.0.429274
```

The decimals it reports **must** match `ASSET_SPECS` in
`packages/core/src/assets.ts`, which says USDC has 6. A mismatch is a money bug,
not a display bug.

> **The Hedera gotcha that will bite you.** Unlike other EVM chains, an account
> cannot receive a token it is not _associated_ with. A fresh Privy wallet has
> no association with USDC, so sending it USDC fails until the wallet either
> associates with the token or has spare auto-association slots. HBAR has no
> such requirement. This is the main reason to run the demo in HBAR and treat
> USDC as a later step.

## Fund the wallets

Agents spend from their own Privy wallet, so send testnet HBAR to the address
returned when you registered the agent:

```bash
curl -s localhost:8080/v1/agents -H "authorization: Bearer $POCKET_API_KEY" \
  | jq -r '.agents[].wallet.address'
```

Then point the paid service at an address you control, so you can watch the
money arrive:

```bash
PAID_SERVICE_ADDRESS=0xYourReceivingAddress
```

## Check it worked

```bash
curl -s localhost:8080/v1/health | jq .adapters.chain
# { "provider": "hedera", "live": true }

curl -s localhost:8402/health | jq .verification
# "on-chain"
```

`on-chain` means the seller now verifies each payment by reading the
transaction itself, instead of trusting the proof. Buy something and the
payment record carries a real HashScan link:

```bash
curl -s "localhost:8080/v1/payments?limit=1" \
  -H "authorization: Bearer $POCKET_API_KEY" | jq '.payments[0].explorerUrl'
```

Mainnet works the same way: set `CHAIN=hedera-mainnet`,
`HEDERA_MAINNET_RPC_URL` and `HEDERA_MAINNET_USDC_ADDRESS`. Do not point this
at mainnet with real funds until you have watched the policy engine block
something on testnet.

# `@pocket/paid-service`

The other side of the trade.

An x402 seller that states a price and is paid before it serves. It knows
nothing about Pocket and holds no relationship with the buyer: a facilitator
verifies and settles the payment, and only then does the data come back.

That independence is the point. Without a real counterparty the demo would be
Pocket paying itself.

## Run it

```bash
pnpm --filter @pocket/paid-service dev
```

[`pay.pocket-app.xyz`](https://pay.pocket-app.xyz) is the deployed seller, and
the local one answers on `:8402`. Either one describes itself at `/`: who it is
paid at, which facilitator settles for it, and its live catalogue.

## What it sells

Six feeds, all backed by a live upstream, priced in the range a commercial
provider would charge.

| Path                     | Price | Refreshes | From                            |
| ------------------------ | ----- | --------- | ------------------------------- |
| `/v1/market/prices`      | 0.01  | 60s       | CoinGecko                       |
| `/v1/network/gas`        | 0.02  | 20s       | A public Ethereum node          |
| `/v1/defi/chains`        | 0.05  | 10m       | DefiLlama                       |
| `/v1/defi/stablecoins`   | 0.08  | 15m       | DefiLlama                       |
| `/v1/research/eth-brief` | 0.08  | 5m        | All three, joined               |
| `/v1/research/deep-dive` | 0.75  | 5m        | The brief, plus the full tables |

`GET /catalog` quotes all of it without charging, so a buyer sees the same price
the policy engine will.

## What the handshake looks like

```
GET /v1/market/prices
  ← 402, terms in a payment-required header

GET /v1/market/prices
  → signed transfer in a payment-signature header
  ← facilitator verifies, settles, pays the network fee
  ← 200, the data and its receipt
```

## Every feed is warmed before the port opens

A feed whose upstream is unreachable at startup is simply not offered. This
service never quotes a price for something it cannot deliver, and `GET /` names
what is missing rather than hiding it.

Snapshots refresh on a timer. A stale one is served and marked stale rather than
failing a request that was already paid for.

## Configuration

| Variable                     | What it is                                   |
| ---------------------------- | -------------------------------------------- |
| `PAID_SERVICE_PORT`          | Port to bind, default `8402`                 |
| `PAID_SERVICE_ADDRESS`       | EVM address it is paid at                    |
| `X402_FACILITATOR_URL`       | Who verifies and settles                     |
| `X402_NETWORK`               | Settlement network, e.g. `hedera:testnet`    |
| `X402_ASSET`                 | Token id it prices in                        |
| `X402_ASSET_DECIMALS`        | Decimal places of that token, default `6`    |
| `X402_ASSET_SYMBOL`          | Ticker shown beside a price, default `USDC`  |
| `PAID_SERVICE_PRICE`         | Overrides the standard feed price            |
| `PAID_SERVICE_PREMIUM_PRICE` | Overrides the deep-dive price                |
| `PAID_SERVICE_PUBLIC_URL`    | The origin a 402 names as the resource       |
| `HEDERA_MIRROR_URL`          | Used once at startup to resolve the payee id |

The payee is resolved from address to Hedera account id at startup rather than
pasted into configuration, because the x402 Hedera scheme addresses accounts by
id and wallets are provisioned by address.

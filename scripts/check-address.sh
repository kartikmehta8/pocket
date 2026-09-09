#!/usr/bin/env bash
# Checks whether an EVM address is a usable payment destination on Hedera.
#
#   ./scripts/check-address.sh 0xYourAddress [USDC|HBAR]
#
# Hedera is not Ethereum here: low addresses map to real account numbers, and an
# account cannot receive a token it has not associated with. Both are silent
# failures if you do not look.
set -euo pipefail
ADDR=${1:?usage: check-address.sh 0xADDRESS [USDC|HBAR]}
ASSET=${2:-USDC}
RPC=${HEDERA_RPC_URL:-https://testnet.hashio.io/api}
MIRROR=${HEDERA_MIRROR_URL:-https://testnet.mirrornode.hedera.com}
USDC=${HEDERA_USDC_ADDRESS:-0x0000000000000000000000000000000000068cda}

echo "Address  $ADDR"
echo "Asset    $ASSET"
echo

curl -s "$MIRROR/api/v1/accounts/$ADDR" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if d.get('_status'):
    print('  account   does not exist yet')
    print('            It is created on first transfer. Fund it, or expect the')
    print('            first payment to create it as a hollow account.')
else:
    tinybars = int(d.get('balance', {}).get('balance') or 0)
    print(f\"  account   {d.get('account')}\")
    print(f\"  balance   {tinybars / 1e8:.8f} HBAR\")
    if d.get('evm_address'):
        print(f\"  evm       {d['evm_address']}\")
"

if [ "$ASSET" = "USDC" ]; then
  RESULT=$(curl -s -X POST "$RPC" -H 'content-type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_call\",\"params\":[{\"from\":\"$ADDR\",\"to\":\"$USDC\",\"data\":\"0x4d8fdd6d\"},\"latest\"]}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('result','0x0'))")
  if [ "$((RESULT))" = "1" ]; then
    echo "  USDC      associated, can receive"
  else
    echo "  USDC      NOT associated, transfers to it will be refused"
    echo "            Associate it, or settle in HBAR instead."
  fi
else
  echo "  HBAR      native, no association needed"
fi

#!/usr/bin/env bash
run_geth() {
  docker run \
    -v /$PWD/scripts:/scripts \
    -d \
    -p 8545:8545 \
    -p 30303:30303 \
    ethereum/client-go:latest \
    --rpc \
    --rpcaddr '0.0.0.0' \
    --rpcport 8545 \
    --rpccorsdomain '*' \
    --nodiscover \
    --dev \
    --dev.period 1 \
    --targetgaslimit '7000000' \
    js ./scripts/geth-accounts.js \
    > /dev/null &
}

if [ "$INTEGRATION" = true ]; then

  lerna run --scope truffle test --stream

elif [ "$GETH" = true ]; then

  run_geth
  lerna run --scope truffle test --stream

else

  lerna run --scope truffle-* test --stream

fi
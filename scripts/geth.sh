#!/usr/bin/env bash

docker pull ethereum/client-go:v1.9.25

docker run \
    -v /$PWD/scripts:/scripts \
    -i \
    -p 8545:8545 \
    -p 8546:8546 \
    -p 30303:30303 \
    ethereum/client-go:v1.9.25 \
    --rpc \
    --rpcaddr '0.0.0.0' \
    --rpcport 8545 \
    --rpccorsdomain '*' \
    --ws \
    --nodiscover \
    --dev \
    --dev.period 0 \
    --allow-insecure-unlock \
    js ./scripts/geth-accounts.js

#!/usr/bin/env bash

docker pull ethereum/client-go:stable

CID=$(docker run \
  -v /$PWD/scripts:/scripts \
  -t \
  -d \
  -p 8545:8545 \
  -p 8546:8546 \
  -p 30303:30303 \
  ethereum/client-go:stable \
  --http \
  --http.addr '0.0.0.0' \
  --http.port 8545 \
  --http.corsdomain '*' \
  --ws \
  --ws.addr '0.0.0.0' \
  --ws.origins '*' \
  --nodiscover \
  --dev \
  --dev.period 0 \
  --allow-insecure-unlock \
  --preload ./scripts/geth-accounts.js \
  console)

printf "Geth running in docker container ${CID}\n"
printf "Connect to geth:\n  docker exec -it ${CID:0:8} geth attach http://localhost:8545 console\n"

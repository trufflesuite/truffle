#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

run_geth() {
  docker run \
    -v /$PWD/scripts:/scripts \
    -d \
    -p 8545:8545 \
    -p 8546:8546 \
    -p 30303:30303 \
    ethereum/client-go:latest \
    --rpc \
    --rpcaddr '0.0.0.0' \
    --rpcport 8545 \
    --rpccorsdomain '*' \
    --ws \
    --wsaddr '0.0.0.0' \
    --wsorigins '*' \
    --nodiscover \
    --dev \
    --dev.period 0 \
    --allow-insecure-unlock \
    --targetgaslimit '7000000' \
    js ./scripts/geth-accounts.js \
    > /dev/null &
}

if [ "$INTEGRATION" = true ]; then

  sudo apt-get install -y jq
  lerna run --scope truffle test --stream

elif [ "$GETH" = true ]; then

  sudo apt-get install -y jq
  docker pull ethereum/client-go:latest
  run_geth
  lerna run --scope truffle test --stream -- --exit
  lerna run --scope truffle-contract test --stream -- --exit

elif [ "$PACKAGES" = true ]; then

  docker pull ethereum/solc:0.4.22
  sudo apt-get install -y snapd solc
  export PATH=$PATH:/snap/bin
  sudo snap install vyper --beta --devmode
  lerna run --scope truffle-* test --stream --concurrency=1

elif [ "$COVERAGE" = true ]; then

  docker pull ethereum/solc:0.4.22
  sudo apt-get install -y jq snapd solc
  export PATH=$PATH:/snap/bin
  sudo snap install vyper --beta --devmode
  cd packages/truffle-debugger && yarn test:coverage && \
  cd ../../ && nyc lerna run --ignore truffle-debugger test && \
  cat ./packages/truffle-debugger/coverage/lcov.info >> ./coverage/lcov.info && \
  cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js

fi

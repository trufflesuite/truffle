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

elif [ "$QUORUM" = true ]; then

  sudo rm /usr/local/bin/docker-compose
  curl -L https://github.com/docker/compose/releases/download/1.21.0/docker-compose-`uname -s`-`uname -m` > docker-compose
  chmod +x docker-compose
  sudo mv docker-compose /usr/local/bin
  git clone https://github.com/jpmorganchase/quorum-examples
  cd quorum-examples
  docker-compose up -d
  sleep 90
  lerna run --scope truffle test --stream -- --exit

elif [ "$PACKAGES" = true ]; then

  docker pull ethereum/solc:0.4.22
  sudo add-apt-repository -y ppa:deadsnakes/ppa
  sudo apt-get update
  sudo apt-get install -y python3.6 python3.6-dev python3.6-venv solc
  wget https://bootstrap.pypa.io/get-pip.py
  sudo python3.6 get-pip.py
  sudo pip3 install vyper
  lerna run --scope truffle-* test --stream --concurrency=1

elif [ "$COVERAGE" = true ]; then

  docker pull ethereum/solc:0.4.22
  sudo add-apt-repository -y ppa:deadsnakes/ppa
  sudo apt-get update
  sudo apt-get install -y jq python3.6 python3.6-dev python3.6-venv solc
  wget https://bootstrap.pypa.io/get-pip.py
  sudo python3.6 get-pip.py
  sudo pip3 install vyper
  cd packages/truffle-debugger && yarn test:coverage && \
  cd ../../ && nyc lerna run --ignore truffle-debugger test && \
  cat ./packages/truffle-debugger/coverage/lcov.info >> ./coverage/lcov.info && \
  cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js

fi

#!/usr/bin/env bash

set -o errexit

run_geth() {
  docker run \
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
    --dev.period 2 \
    --targetgaslimit '7000000' \
    > /dev/null &
}

run_geth_test() {
  npm install
  npm run test:geth
}

run_docker_test() {
  docker run -it --rm --name ${TEST} \
    -e TRAVIS_REPO_SLUG \
    -e TRAVIS_PULL_REQUEST \
    -e TRAVIS_PULL_REQUEST_SLUG \
    -e TRAVIS_PULL_REQUEST_BRANCH \
    -e TRAVIS_BRANCH \
    -e TEST \
  truffle/ci:latest run_tests
}

if [ "$GETH" == "true" ]; then
  run_geth
  sleep 30
  run_geth_test
else
  run_docker_test
fi

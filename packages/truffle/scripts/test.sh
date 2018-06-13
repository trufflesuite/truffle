#!/usr/bin/env bash

run_geth() {
  docker run \
    -v /$PWD/scripts:/scripts \
    -d \
    --net="host" \
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

run_geth_test() {
  docker run -it --rm --name ${TEST} --net="host" \
    -e TRAVIS_REPO_SLUG \
    -e TRAVIS_PULL_REQUEST \
    -e TRAVIS_PULL_REQUEST_SLUG \
    -e TRAVIS_PULL_REQUEST_BRANCH \
    -e TRAVIS_BRANCH \
    -e TEST \
    -e GETH \
    -e MAIN_REPO_CI \
  truffle/ci:latest run_tests
}

run_ganache_test() {
  docker run -it --rm --name ${TEST} \
    -e TRAVIS_REPO_SLUG \
    -e TRAVIS_PULL_REQUEST \
    -e TRAVIS_PULL_REQUEST_SLUG \
    -e TRAVIS_PULL_REQUEST_BRANCH \
    -e TRAVIS_BRANCH \
    -e TEST \
    -e GANACHE \
    -e MAIN_REPO_CI \
  truffle/ci:latest run_tests
}


if [ "$GETH" = true ]; then
  run_geth
  run_geth_test
else
  run_ganache_test
fi






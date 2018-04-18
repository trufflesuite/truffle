#!/usr/bin/env bash

set -o errexit

run_native_tests() {
  sudo add-apt-repository --yes ppa:ethereum/ethereum
  sudo apt-get update
  sudo apt-get install solc

  docker pull ethereum/solc:0.4.22
  npm install
  npm run test:native
}

run_container_tests() {
  docker run -it --rm --name ${TEST} \
    -e TRAVIS_REPO_SLUG \
    -e TRAVIS_PULL_REQUEST \
    -e TRAVIS_PULL_REQUEST_SLUG \
    -e TRAVIS_PULL_REQUEST_BRANCH \
    -e TRAVIS_BRANCH \
    -e TEST \
  truffle/ci:latest run_tests
}

if [ "$TEST" == "native" ]; then
  run_native_tests
else
  run_container_tests
fi

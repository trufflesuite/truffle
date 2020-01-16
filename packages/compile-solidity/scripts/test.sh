#!/usr/bin/env bash

set -o errexit

if [ "$CI" = true ]; then
  mocha ./test --recursive --timeout 10000 $@
else
  rm -rf ./node_modules/.cache/truffle
  mocha ./test --recursive --invert --grep native --timeout 10000 $@
fi

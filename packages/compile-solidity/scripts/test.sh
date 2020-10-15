#!/usr/bin/env bash

set -o errexit

if [ "$CI" = true ]; then
  mocha ./test/** ./test/**/* --timeout 30000 $@
else
  rm -rf ./node_modules/.cache/truffle
  mocha ./test/** ./test/**/* --invert --grep native --timeout 30000 $@
fi

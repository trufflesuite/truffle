#!/usr/bin/env bash

set -o errexit

if [ "$CI" = true ]; then
  mocha ./test/** ./test/**/* --timeout 40000 $@
else
  rm -rf ./node_modules/.cache/truffle
  mocha ./test/** ./test/**/* --invert --grep native --timeout 40000 $@
fi

#!/usr/bin/env bash

set -o errexit

yarn prepare

if [ "$CI" = true ]; then
  mocha ./test/** ./test/**/* --timeout 70000 $@
else
  rm -rf ./node_modules/.cache/truffle
  mocha ./test/** ./test/**/* --invert --grep native --timeout 70000 $@
fi

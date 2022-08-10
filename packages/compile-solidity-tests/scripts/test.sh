#!/usr/bin/env bash

set -o errexit

yarn prepare

if [ "$CI" = true ]; then
  mocha ./test/*.js ./test/**/*.js --timeout 70000 $@
else
  rm -rf ./node_modules/.cache/truffle
  mocha ./test/*.js ./test/**/*.js --invert --grep native --timeout 70000 $@
fi

#!/usr/bin/env bash

set -o errexit

yarn prepare

if [ "$CI" = true ]; then
  mocha -r ts-node/register ./test/** ./test/**/* --timeout 70000 $@
else
  rm -rf ./node_modules/.cache/truffle
  mocha -r ts-node/register ./test/*.ts ./test/**/*.ts --invert --grep native --timeout 70000 $@
fi

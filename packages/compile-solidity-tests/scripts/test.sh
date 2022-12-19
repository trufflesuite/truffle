#!/usr/bin/env bash

set -o errexit

if [ "$CI" = true ]; then
  mocha -r ts-node/register "./test/**/*.ts" --timeout 70000 "$@"
else
  rm -rf ./node_modules/.cache/truffle
  mocha -r ts-node/register "./test/**/*.ts" --invert --grep native --timeout 70000 "$@"
fi

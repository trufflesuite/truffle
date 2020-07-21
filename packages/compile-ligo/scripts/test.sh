#!/usr/bin/env bash

set -o errexit

if [ "$CI" = true ]; then
  mocha -r ts-node/register test/*.ts --timeout 10000 $@
fi

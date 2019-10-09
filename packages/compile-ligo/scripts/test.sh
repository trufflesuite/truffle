#!/usr/bin/env bash

set -o errexit

if [ "$CI" = true ]; then
  mocha ./test/** --timeout 10000 $@
fi

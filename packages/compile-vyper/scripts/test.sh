#!/usr/bin/env bash

set -o errexit

if [ "$CI" = true ]; then
  mocha ./test/** ./test/**/* --timeout 10000 $@
fi

#!/usr/bin/env bash

set -o errexit

if [ "$CI" = true ]; then
  mocha ./test/** --timeout 10000 $@
else
  mocha ./test/** --invert --grep native --timeout 10000 $@
fi

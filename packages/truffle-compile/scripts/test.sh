#!/usr/bin/env bash

set -o errexit

if [ "$CI" = true ]; then
  mocha ./test/** ./test/**/* --timeout 10000 $@
else
  mocha ./test/** ./test/**/* --invert --grep native --timeout 10000 $@
fi
